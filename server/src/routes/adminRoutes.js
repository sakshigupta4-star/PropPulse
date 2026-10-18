import { Router } from "express";
import { getStats, getUsers, updateUserRole } from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();
router.use(protect, authorize("admin"));

router.get("/stats", getStats);
router.get("/users", getUsers);
router.patch("/users/:id/role", updateUserRole);

export default router;