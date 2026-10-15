import { Router } from "express";
import {
  createProperty,
  getProperties,
  getMyProperties,
  getAllForAdmin,
  getProperty,
  updateProperty,
  deleteProperty,
  adminUpdateProperty,
} from "../controllers/propertyController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";

const router = Router();
const sellers = authorize("agent", "builder", "admin");

router.get("/", getProperties);
router.get("/mine", protect, getMyProperties);
router.get("/admin/all", protect, authorize("admin"), getAllForAdmin);
router.get("/:id", optionalAuth, getProperty);

router.post("/", protect, sellers, createProperty);
router.put("/:id", protect, sellers, updateProperty);
router.delete("/:id", protect, sellers, deleteProperty);
router.patch("/:id/admin", protect, authorize("admin"), adminUpdateProperty);

export default router;