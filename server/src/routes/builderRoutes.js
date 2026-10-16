import { Router } from "express";
import {
  createBuilder,
  getMyBuilder,
  updateMyBuilder,
  getBuilders,
  getBuilder,
  getAllBuildersAdmin,
  verifyBuilder,
} from "../controllers/builderController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", getBuilders);
router.get("/me", protect, authorize("builder"), getMyBuilder);
router.put("/me", protect, authorize("builder"), updateMyBuilder);
router.get("/admin/all", protect, authorize("admin"), getAllBuildersAdmin);
router.post("/", protect, authorize("builder"), createBuilder);
router.get("/:id", optionalAuth, getBuilder);
router.patch("/:id/verify", protect, authorize("admin"), verifyBuilder);

export default router;