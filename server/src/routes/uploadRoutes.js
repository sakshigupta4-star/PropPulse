import { Router } from "express";
import { uploadImages } from "../controllers/uploadController.js";
import { upload } from "../middleware/upload.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.post(
  "/images",
  protect,
  authorize("agent", "builder", "admin"),
  upload.array("images", 10),
  uploadImages
);

export default router;