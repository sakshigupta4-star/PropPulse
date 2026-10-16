import { z } from "zod";
import Builder from "../models/builder.js";
import Project from "../models/project.js";
import asyncHandler from "../utils/asyncHandler.js";

const builderSchema = z.object({
  companyName: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  establishedYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  city: z.string().optional(),
  reraRegistrationNumber: z.string().optional(),
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// POST /api/builders  (builder)
export const createBuilder = asyncHandler(async (req, res) => {
  const data = builderSchema.parse(req.body);
  if (await Builder.findOne({ user: req.user._id })) {
    return res.status(409).json({ message: "You already have a builder profile" });
  }
  const builder = await Builder.create({ ...data, user: req.user._id });
  res.status(201).json({ builder });
});

// GET /api/builders/me  (builder)
export const getMyBuilder = asyncHandler(async (req, res) => {
  const builder = await Builder.findOne({ user: req.user._id });
  if (!builder) return res.status(404).json({ message: "No builder profile yet" });
  res.json({ builder });
});

// PUT /api/builders/me  (builder)
export const updateMyBuilder = asyncHandler(async (req, res) => {
  const data = builderSchema.partial().parse(req.body);
  const builder = await Builder.findOne({ user: req.user._id });
  if (!builder) return res.status(404).json({ message: "No builder profile yet" });
  Object.assign(builder, data);
  // Changing the RERA number needs re-verification
  if (data.reraRegistrationNumber) builder.verificationStatus = "pending";
  await builder.save();
  res.json({ builder });
});

// GET /api/builders  (public: verified only)
export const getBuilders = asyncHandler(async (req, res) => {
  const { q, city } = z
    .object({ q: z.string().optional(), city: z.string().optional() })
    .parse(req.query);

  const filter = { verificationStatus: "verified" };
  if (q) filter.companyName = new RegExp(escapeRegex(q), "i");
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, "i");

  const builders = await Builder.find(filter).sort("companyName").lean();
  const withCounts = await Promise.all(
    builders.map(async (b) => ({
      ...b,
      projectCount: await Project.countDocuments({ builder: b._id, approval: "approved" }),
    }))
  );
  res.json({ builders: withCounts });
});

// GET /api/builders/:id  (public if verified; owner/admin can see any)
export const getBuilder = asyncHandler(async (req, res) => {
  const builder = await Builder.findById(req.params.id);
  if (!builder) return res.status(404).json({ message: "Builder not found" });

  const isOwner = req.user && builder.user.toString() === req.user._id.toString();
  const isAdmin = req.user?.role === "admin";
  if (builder.verificationStatus !== "verified" && !isOwner && !isAdmin) {
    return res.status(404).json({ message: "Builder not found" });
  }

  const projects = await Project.find({ builder: builder._id, approval: "approved" })
    .select("name address constructionStatus progressPercent reraStatus images possessionDate")
    .sort("-createdAt");
  res.json({ builder, projects });
});

// GET /api/builders/admin/all?status=pending  (admin)
export const getAllBuildersAdmin = asyncHandler(async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["pending", "verified", "rejected"]).optional() })
    .parse(req.query);
  const builders = await Builder.find(status ? { verificationStatus: status } : {})
    .sort("-createdAt")
    .populate("user", "name email");
  res.json({ builders });
});

// PATCH /api/builders/:id/verify  (admin)
export const verifyBuilder = asyncHandler(async (req, res) => {
  const { verificationStatus } = z
    .object({ verificationStatus: z.enum(["pending", "verified", "rejected"]) })
    .parse(req.body);
  const builder = await Builder.findByIdAndUpdate(
    req.params.id,
    { verificationStatus },
    { returnDocument: "after" }
  );
  if (!builder) return res.status(404).json({ message: "Builder not found" });
  res.json({ builder });
});