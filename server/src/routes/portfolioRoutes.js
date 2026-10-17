import { Router } from "express";
import {
  getPortfolio,
  addItem,
  updateItem,
  deleteItem,
} from "../controllers/portfolioController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect); // every portfolio route needs login

router.get("/", getPortfolio);
router.post("/", addItem);
router.put("/:id", updateItem);
router.delete("/:id", deleteItem);

export default router;