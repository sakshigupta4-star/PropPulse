import { Router } from "express";
import {
  createProject,
  getProjects,
  getMyProjects,
  getAllProjectsAdmin,
  checkRera,
  getProject,
  updateProject,
  deleteProject,
  addUpdate,
  adminUpdateProject,
} from "../controllers/projectController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";

const router = Router();
const builderOrAdmin = authorize("builder", "admin");

// Fixed paths must come before /:id
router.get("/", getProjects);
router.get("/mine", protect, authorize("builder"), getMyProjects);
router.get("/admin/all", protect, authorize("admin"), getAllProjectsAdmin);
router.get("/rera/:number", checkRera);
router.get("/:id", optionalAuth, getProject);

router.post("/", protect, authorize("builder"), createProject);
router.put("/:id", protect, builderOrAdmin, updateProject);
router.delete("/:id", protect, builderOrAdmin, deleteProject);
router.post("/:id/updates", protect, builderOrAdmin, addUpdate);
router.patch("/:id/admin", protect, authorize("admin"), adminUpdateProject);

export default router;