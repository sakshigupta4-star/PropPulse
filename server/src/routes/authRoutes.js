import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, getMe } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Limits repeated attempts to slow down password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { message: "Too many attempts, please try again later" },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", protect, getMe);

// Temporary route to test role-based access
router.get("/admin-test", protect, authorize("admin"), (req, res) =>
  res.json({ message: "Welcome, admin" })
);

export default router;