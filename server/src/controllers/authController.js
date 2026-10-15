import { z } from "zod";
import User from "../models/user.js";
import generateToken from "../utils/generateToken.js";
import asyncHandler from "../utils/asyncHandler.js";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  // admin is NOT allowed here: nobody can make themselves an admin
  role: z.enum(["buyer", "agent", "builder"]).default("buyer"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
});

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const exists = await User.findOne({ email: data.email });
  if (exists) return res.status(409).json({ message: "Email already registered" });

  const user = await User.create(data);
  res.status(201).json({ user: userResponse(user), token: generateToken(user._id) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({ user: userResponse(user), token: generateToken(user._id) });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: userResponse(req.user) });
});