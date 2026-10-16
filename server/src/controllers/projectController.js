import { z } from "zod";
import Project from "../models/project.js";
import Property from "../models/property.js";
import Builder from "../models/builder.js";
import asyncHandler from "../utils/asyncHandler.js";

const projectSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(3000).optional(),
  address: z.object({
    locality: z.string().min(1, "Locality is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().optional(),
  }),
  coordinates: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
  constructionStatus: z.enum(["upcoming", "under_construction", "ready"]).optional(),
  possessionDate: z.coerce.date().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  totalUnits: z.number().int().min(0).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  images: z.array(z.string().url()).max(10).optional(),
  amenities: z.array(z.string()).optional(),
  reraNumber: z.string().optional(),
});

const updateEntrySchema = z.object({
  title: z.string().min(3).max(120),
  note: z.string().max(1000).optional(),
  progressPercent: z.number().min(0).max(100),
});

const adminSchema = z.object({
  approval: z.enum(["pending", "approved", "rejected"]).optional(),
  reraStatus: z.enum(["pending", "verified", "rejected", "expired"]).optional(),
  reraValidTill: z.coerce.date().optional(),
  rejectionReason: z.string().max(500).optional(),
  legalChecks: z
    .object({
      titleClear: z.boolean().optional(),
      approvedLayout: z.boolean().optional(),
      environmentalClearance: z.boolean().optional(),
      occupancyCertificate: z.boolean().optional(),
    })
    .optional(),
});

const querySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  constructionStatus: z.enum(["upcoming", "under_construction", "ready"]).optional(),
  verifiedOnly: z.enum(["true"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactCI = (s) => new RegExp(`^${escapeRegex(s)}$`, "i");

// Loads a project and checks the user owns it (or is admin). Returns null after sending an error.
const loadOwned = async (req, res) => {
  const project = await Project.findById(req.params.id).populate("builder", "user");
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return null;
  }
  const owns = project.builder.user.toString() === req.user._id.toString();
  if (!owns && req.user.role !== "admin") {
    res.status(403).json({ message: "You can only change your own projects" });
    return null;
  }
  return project;
};

// POST /api/projects  (builder)
export const createProject = asyncHandler(async (req, res) => {
  const data = projectSchema.parse(req.body);
  const builder = await Builder.findOne({ user: req.user._id });
  if (!builder) {
    return res.status(400).json({ message: "Create your builder profile first" });
  }
  const project = await Project.create({ ...data, builder: builder._id });
  res.status(201).json({ project });
});

// GET /api/projects  (public: approved only)
export const getProjects = asyncHandler(async (req, res) => {
  const f = querySchema.parse(req.query);
  const filter = { approval: "approved" };
  if (f.city) filter["address.city"] = exactCI(f.city);
  if (f.constructionStatus) filter.constructionStatus = f.constructionStatus;
  if (f.verifiedOnly) filter.reraStatus = "verified";
  if (f.q) {
    const rx = new RegExp(escapeRegex(f.q), "i");
    filter.$or = [{ name: rx }, { "address.locality": rx }, { "address.city": rx }];
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .select("-updates")
      .sort("-createdAt")
      .skip((f.page - 1) * f.limit)
      .limit(f.limit)
      .populate("builder", "companyName logo verificationStatus"),
    Project.countDocuments(filter),
  ]);
  res.json({ projects, total, page: f.page, pages: Math.ceil(total / f.limit) });
});

// GET /api/projects/mine  (builder)
export const getMyProjects = asyncHandler(async (req, res) => {
  const builder = await Builder.findOne({ user: req.user._id });
  if (!builder) return res.json({ projects: [] });
  const projects = await Project.find({ builder: builder._id }).sort("-createdAt");
  res.json({ projects });
});

// GET /api/projects/admin/all?approval=pending  (admin)
export const getAllProjectsAdmin = asyncHandler(async (req, res) => {
  const { approval } = z
    .object({ approval: z.enum(["pending", "approved", "rejected"]).optional() })
    .parse(req.query);
  const projects = await Project.find(approval ? { approval } : {})
    .sort("-createdAt")
    .populate("builder", "companyName verificationStatus");
  res.json({ projects });
});

// GET /api/projects/rera/:number  (public RERA lookup)
export const checkRera = asyncHandler(async (req, res) => {
  const number = req.params.number.trim();
  const project = await Project.findOne({ reraNumber: exactCI(number), approval: "approved" })
    .select("name address reraNumber reraStatus reraVerifiedAt reraValidTill legalChecks progressPercent builder")
    .populate("builder", "companyName");
  const listings = await Property.countDocuments({ reraNumber: exactCI(number), status: "approved" });

  if (!project) {
    return res.json({
      found: false,
      listings,
      message: "No verified record on PropPulse. Please check the official state RERA website.",
    });
  }
  res.json({ found: true, listings, project });
});

// GET /api/projects/:id  (public if approved; owner/admin can see any)
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate(
    "builder",
    "companyName logo description website verificationStatus user"
  );
  if (!project) return res.status(404).json({ message: "Project not found" });

  const isOwner = req.user && project.builder.user.toString() === req.user._id.toString();
  const isAdmin = req.user?.role === "admin";
  if (project.approval !== "approved" && !isOwner && !isAdmin) {
    return res.status(404).json({ message: "Project not found" });
  }

  const obj = project.toJSON();
  obj.updates = [...obj.updates].sort((a, b) => b.createdAt - a.createdAt); // newest first
  delete obj.builder.user; // don't expose the owner's user id
  res.json({ project: obj });
});

// PUT /api/projects/:id  (owner or admin)
export const updateProject = asyncHandler(async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;

  const data = projectSchema.partial().parse(req.body);
  const reraChanged = data.reraNumber && data.reraNumber !== project.reraNumber;
  Object.assign(project, data);

  if (req.user.role !== "admin") {
    if (reraChanged) project.reraStatus = "pending"; // must be re-verified
    project.approval = "pending"; // edits need re-approval
  }
  await project.save();
  res.json({ project });
});

// DELETE /api/projects/:id  (owner or admin)
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;
  await project.deleteOne();
  res.json({ message: "Project deleted" });
});

// POST /api/projects/:id/updates  (owner or admin: construction progress)
export const addUpdate = asyncHandler(async (req, res) => {
  const project = await loadOwned(req, res);
  if (!project) return;

  const entry = updateEntrySchema.parse(req.body);
  project.updates.push(entry);
  project.progressPercent = entry.progressPercent;
  if (entry.progressPercent === 100) project.constructionStatus = "ready";
  else if (project.constructionStatus === "upcoming") project.constructionStatus = "under_construction";
  await project.save();
  res.status(201).json({ project });
});

// PATCH /api/projects/:id/admin  (admin: approve, RERA, legal checks)
export const adminUpdateProject = asyncHandler(async (req, res) => {
  const { legalChecks, ...rest } = adminSchema.parse(req.body);

  const set = { ...rest };
  if (legalChecks) {
    for (const [key, value] of Object.entries(legalChecks)) set[`legalChecks.${key}`] = value;
  }
  if (rest.reraStatus === "verified") set.reraVerifiedAt = new Date();

  if (Object.keys(set).length === 0) {
    return res.status(400).json({ message: "Provide approval, reraStatus, reraValidTill or legalChecks" });
  }

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { $set: set },
    { returnDocument: "after", runValidators: true }
  );
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json({ project });
});