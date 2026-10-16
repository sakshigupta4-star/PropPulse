import { Router } from "express";
import {
  getCityPrices,
  getTrend,
  getDistribution,
  getInfrastructure,
  upsertStat,
  createInfrastructure,
  updateInfrastructure,
  deleteInfrastructure,
} from "../controllers/marketController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();
const admin = [protect, authorize("admin")];

router.get("/prices", getCityPrices);
router.get("/trend", getTrend);
router.get("/distribution", getDistribution);
router.get("/infrastructure", getInfrastructure);

router.post("/stats", ...admin, upsertStat);
router.post("/infrastructure", ...admin, createInfrastructure);
router.put("/infrastructure/:id", ...admin, updateInfrastructure);
router.delete("/infrastructure/:id", ...admin, deleteInfrastructure);

export default router;