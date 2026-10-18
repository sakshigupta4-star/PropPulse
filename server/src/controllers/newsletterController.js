import { z } from "zod";
import Subscriber from "../models/subscriber.js";
import asyncHandler from "../utils/asyncHandler.js";

const schema = z.object({ email: z.string().email("Invalid email").toLowerCase() });

// POST /api/newsletter  (public)
export const subscribe = asyncHandler(async (req, res) => {
  const { email } = schema.parse(req.body);
  const exists = await Subscriber.findOne({ email });
  if (exists) return res.json({ message: "You are already subscribed" });
  await Subscriber.create({ email });
  res.status(201).json({ message: "Subscribed successfully" });
});

// GET /api/newsletter  (admin)
export const listSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await Subscriber.find().sort("-createdAt");
  res.json({ subscribers, total: subscribers.length });
});