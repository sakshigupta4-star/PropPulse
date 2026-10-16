import { z } from "zod";
import MarketStat from "../models/marketStat.js";
import Infrastructure from "../models/infrastructure.js";
import Property from "../models/property.js";
import asyncHandler from "../utils/asyncHandler.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactCI = (s) => new RegExp(`^${escapeRegex(s)}$`, "i");

const statSchema = z.object({
  city: z.string().min(2),
  locality: z.string().optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use format YYYY-MM"),
  avgPricePerSqft: z.number().positive(),
  avgRentPerSqft: z.number().positive().optional(),
});

const infraSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(1000).optional(),
  type: z.enum(["metro", "highway", "airport", "railway", "road", "hospital", "school", "mall", "it_park", "other"]),
  city: z.string().min(2),
  locality: z.string().optional(),
  status: z.enum(["planned", "under_construction", "completed"]).optional(),
  expectedCompletion: z.coerce.date().optional(),
  expectedImpact: z.string().max(300).optional(),
  coordinates: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
  sourceUrl: z.string().url().optional(),
});

// GET /api/market/prices  -> latest average price per sq ft for each city (bar chart)
export const getCityPrices = asyncHandler(async (req, res) => {
  const cities = await MarketStat.aggregate([
    { $match: { locality: null } },
    { $sort: { month: -1 } },
    {
      $group: {
        _id: "$city",
        month: { $first: "$month" },
        avgPricePerSqft: { $first: "$avgPricePerSqft" },
        avgRentPerSqft: { $first: "$avgRentPerSqft" },
      },
    },
    { $project: { _id: 0, city: "$_id", month: 1, avgPricePerSqft: 1, avgRentPerSqft: 1 } },
    { $sort: { avgPricePerSqft: -1 } },
  ]);
  res.json({ cities });
});

// GET /api/market/trend?city=Pune&months=12  -> price trend (line chart)
export const getTrend = asyncHandler(async (req, res) => {
  const { city, locality, months } = z
    .object({
      city: z.string().min(2),
      locality: z.string().optional(),
      months: z.coerce.number().int().min(2).max(60).default(12),
    })
    .parse(req.query);

  const rows = await MarketStat.find({
    city: exactCI(city),
    locality: locality ? exactCI(locality) : null,
  })
    .sort("-month")
    .limit(months)
    .lean();

  const points = rows.reverse().map((r) => ({
    month: r.month,
    avgPricePerSqft: r.avgPricePerSqft,
    avgRentPerSqft: r.avgRentPerSqft,
  }));

  let changePercent = null;
  if (points.length >= 2) {
    const first = points[0].avgPricePerSqft;
    const last = points[points.length - 1].avgPricePerSqft;
    changePercent = Number((((last - first) / first) * 100).toFixed(1));
  }
  res.json({ city, points, changePercent });
});

// GET /api/market/distribution?city=Pune  -> property type split (donut chart)
export const getDistribution = asyncHandler(async (req, res) => {
  const { city } = z.object({ city: z.string().optional() }).parse(req.query);
  const match = { status: "approved" };
  if (city) match["address.city"] = exactCI(city);

  const rows = await Property.aggregate([
    { $match: match },
    { $group: { _id: "$propertyType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const distribution = rows.map((r) => ({
    propertyType: r._id,
    count: r.count,
    percent: total ? Number(((r.count / total) * 100).toFixed(1)) : 0,
  }));
  res.json({ total, distribution });
});

// GET /api/market/infrastructure?city=Pune&type=metro&status=planned  (public)
export const getInfrastructure = asyncHandler(async (req, res) => {
  const f = z
    .object({
      city: z.string().optional(),
      type: infraSchema.shape.type.optional(),
      status: infraSchema.shape.status,
    })
    .parse(req.query);

  const filter = {};
  if (f.city) filter.city = exactCI(f.city);
  if (f.type) filter.type = f.type;
  if (f.status) filter.status = f.status;

  const items = await Infrastructure.find(filter).sort({ expectedCompletion: 1, createdAt: -1 });
  res.json({ items });
});

// POST /api/market/stats  (admin: add or update a monthly figure)
export const upsertStat = asyncHandler(async (req, res) => {
  const d = statSchema.parse(req.body);
  const stat = await MarketStat.findOneAndUpdate(
    { city: d.city.trim(), locality: d.locality?.trim() || null, month: d.month },
    { $set: { avgPricePerSqft: d.avgPricePerSqft, avgRentPerSqft: d.avgRentPerSqft } },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  res.status(201).json({ stat });
});

// POST /api/market/infrastructure  (admin)
export const createInfrastructure = asyncHandler(async (req, res) => {
  const item = await Infrastructure.create(infraSchema.parse(req.body));
  res.status(201).json({ item });
});

// PUT /api/market/infrastructure/:id  (admin)
export const updateInfrastructure = asyncHandler(async (req, res) => {
  const data = infraSchema.partial().parse(req.body);
  const item = await Infrastructure.findByIdAndUpdate(req.params.id, data, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!item) return res.status(404).json({ message: "Infrastructure item not found" });
  res.json({ item });
});

// DELETE /api/market/infrastructure/:id  (admin)
export const deleteInfrastructure = asyncHandler(async (req, res) => {
  const item = await Infrastructure.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Infrastructure item not found" });
  res.json({ message: "Deleted" });
});