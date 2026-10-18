import { Router } from "express";
import rateLimit from "express-rate-limit";
import { subscribe, listSubscribers } from "../controllers/newsletterController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: "Too many requests, please try again later" },
});

router.post("/", limiter, subscribe);
router.get("/", protect, authorize("admin"), listSubscribers);

export default router;