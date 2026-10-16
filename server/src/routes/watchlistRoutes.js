import { Router } from "express";
import {
  getWatchlist,
  getWatchlistIds,
  addToWatchlist,
  removeFromWatchlist,
} from "../controllers/watchlistController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", getWatchlist);
router.get("/ids", getWatchlistIds);
router.post("/:propertyId", addToWatchlist);
router.delete("/:propertyId", removeFromWatchlist);

export default router;