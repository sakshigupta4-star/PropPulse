import { z } from "zod";
import User from "../models/user.js";
import Property from "../models/property.js";
import Subscriber from "../models/subscriber.js";
import asyncHandler from "../utils/asyncHandler.js";

const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.count]));

// GET /api/admin/stats
export const getStats = asyncHandler(async (req, res) => {
  const [usersByRole, propsByStatus, views, topCities, subscribers, recentPending] =
    await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Property.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Property.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
      Property.aggregate([
        { $match: { status: "approved" } },
        {
          $group: {
            _id: "$address.city",
            count: { $sum: 1 },
            avgPrice: { $avg: "$price" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Subscriber.countDocuments(),
      Property.find({ status: "pending" })
        .sort("-createdAt")
        .limit(5)
        .select("title price address.city createdAt")
        .populate("owner", "name"),
    ]);

  res.json({
    users: toMap(usersByRole),
    properties: toMap(propsByStatus),
    totalViews: views[0]?.total || 0,
    topCities: topCities.map((c) => ({
      city: c._id,
      listings: c.count,
      avgPrice: Math.round(c.avgPrice),
    })),
    subscribers,
    recentPending,
  });
});

// GET /api/admin/users?role=agent&page=1
export const getUsers = asyncHandler(async (req, res) => {
  const q = z
    .object({
      role: z.enum(["admin", "builder", "agent", "buyer"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .parse(req.query);

  const filter = q.role ? { role: q.role } : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort("-createdAt").skip((q.page - 1) * q.limit).limit(q.limit),
    User.countDocuments(filter),
  ]);
  res.json({ users, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

// PATCH /api/admin/users/:id/role
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = z
    .object({ role: z.enum(["admin", "builder", "agent", "buyer"]) })
    .parse(req.body);

  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot change your own role" });
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});