import { Router } from "express";
import { emi, analyze } from "../controllers/investmentController.js";

const router = Router();
router.post("/emi", emi);
router.post("/analyze", analyze);

export default router;