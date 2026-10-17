import { notify } from "../utils/notify.js";
import Watchlist from "../models/watchlist.js";
import { z } from "zod";
import Property, { PROPERTY_TYPES } from "../models/property.js";
import asyncHandler from "../utils/asyncHandler.js";

// ---------- Validation ----------
// Unknown fields (status, owner, featured...) are stripped automatically,
// so users cannot set them.
const createSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().max(3000).optional(),
  listingType: z.enum(["sale", "rent"]),
  propertyType: z.enum(PROPERTY_TYPES),
  price: z.number().positive("Price must be positive"),
  areaSqft: z.number().positive("Area must be positive"),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  address: z.object({
    line: z.string().optional(),
    locality: z.string().min(1, "Locality is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }),
  coordinates: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
  images: z
    .array(z.object({ url: z.string().url(), publicId: z.string().optional() }))
    .max(10)
    .optional(),
  amenities: z.array(z.string()).optional(),
  reraNumber: z.string().optional(),
  isNewLaunch: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  locality: z.string().optional(),
  listingType: z.enum(["sale", "rent"]).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  featured: z.enum(["true"]).optional(),
  newLaunch: z.enum(["true"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "area_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const adminSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "sold"]).optional(),
  featured: z.boolean().optional(),
  rejectionReason: z.string().max(500).optional(),
});

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  area_desc: { areaSqft: -1 },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactCI = (s) => new RegExp(`^${escapeRegex(s)}$`, "i");

const isOwnerOrAdmin = (property, user) =>
  user && (user.role === "admin" || property.owner.toString() === user._id.toString());

// ---------- Controllers ----------

// POST /api/properties  (agent, builder, admin)
export const createProperty = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const property = await Property.create({
    ...data,
    owner: req.user._id,
    // Admin listings go live instantly; others wait for approval
    status: req.user.role === "admin" ? "approved" : "pending",
  });
  res.status(201).json({ property });
});

// GET /api/properties  (public: approved listings only)
export const getProperties = asyncHandler(async (req, res) => {
  const f = querySchema.parse(req.query);

  const filter = { status: "approved" };
  if (f.listingType) filter.listingType = f.listingType;
  if (f.propertyType) filter.propertyType = f.propertyType;
  if (f.city) filter["address.city"] = exactCI(f.city);
  if (f.locality) filter["address.locality"] = exactCI(f.locality);
  if (f.bedrooms !== undefined) filter.bedrooms = { $gte: f.bedrooms };
  if (f.featured) filter.featured = true;
  if (f.newLaunch) filter.isNewLaunch = true;

  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    filter.price = {};
    if (f.minPrice !== undefined) filter.price.$gte = f.minPrice;
    if (f.maxPrice !== undefined) filter.price.$lte = f.maxPrice;
  }

  if (f.q) {
    const rx = new RegExp(escapeRegex(f.q), "i");
    filter.$or = [
      { title: rx },
      { "address.locality": rx },
      { "address.city": rx },
      { "address.line": rx },
    ];
  }

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .sort(SORTS[f.sort])
      .skip((f.page - 1) * f.limit)
      .limit(f.limit)
      .populate("owner", "name role"),
    Property.countDocuments(filter),
  ]);

  res.json({ properties, total, page: f.page, pages: Math.ceil(total / f.limit) });
});

// GET /api/properties/mine  (logged-in owner)
export const getMyProperties = asyncHandler(async (req, res) => {
  const properties = await Property.find({ owner: req.user._id }).sort("-createdAt");
  res.json({ properties });
});

// GET /api/properties/admin/all?status=pending  (admin)
export const getAllForAdmin = asyncHandler(async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["pending", "approved", "rejected", "sold"]).optional() })
    .parse(req.query);
  const properties = await Property.find(status ? { status } : {})
    .sort("-createdAt")
    .populate("owner", "name email role");
  res.json({ properties });
});

// GET /api/properties/:id  (public if approved; owner/admin can see any)
export const getProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).populate(
    "owner",
    "name role phone"
  );
  if (!property) return res.status(404).json({ message: "Property not found" });

  const canSee = property.status === "approved" || isOwnerOrAdmin(property, req.user);
  if (!canSee) return res.status(404).json({ message: "Property not found" });

  // Count a view only for public visitors
  if (property.status === "approved" && !isOwnerOrAdmin(property, req.user)) {
    await Property.updateOne({ _id: property._id }, { $inc: { views: 1 } });
  }
  res.json({ property });
});

// PUT /api/properties/:id  (owner or admin)
export const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ message: "Property not found" });
  if (!isOwnerOrAdmin(property, req.user)) {
    return res.status(403).json({ message: "You can only edit your own listings" });
  }

  const data = updateSchema.parse(req.body);
  Object.assign(property, data);

  // Edits by non-admins need to be re-approved
  if (req.user.role !== "admin" && property.status === "approved") {
    property.status = "pending";
  }
  await property.save();
  res.json({ property });
});

// DELETE /api/properties/:id  (owner or admin)
export const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ message: "Property not found" });
  if (!isOwnerOrAdmin(property, req.user)) {
    return res.status(403).json({ message: "You can only delete your own listings" });
  }
  await Watchlist.deleteMany({ property: property._id });
  await property.deleteOne();
  res.json({ message: "Property deleted" });
});

// PATCH /api/properties/:id/admin  (admin: approve, reject, feature)
export const adminUpdateProperty = asyncHandler(async (req, res) => {
  const data = adminSchema.parse(req.body);
  const property = await Property.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!property) return res.status(404).json({ message: "Property not found" });
  if (data.status === "approved" || data.status === "rejected") {
    const approved = data.status === "approved";
    await notify(property.owner, {
      type: approved ? "property_approved" : "property_rejected",
      title: approved ? "Your listing is live" : "Your listing was rejected",
      message: approved
        ? `"${property.title}" has been approved.`
        : `"${property.title}" was rejected. ${data.rejectionReason || ""}`.trim(),
      link: `/properties/${property._id}`,
    });
  }
  res.json({ property });
});
