import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getTodayMood, saveMood, getMoodHistory } from "../controllers/mood.controller";

const router = Router();
router.use(authenticate);

router.get("/today", getTodayMood);
router.post("/", saveMood);
router.get("/history", getMoodHistory);

export default router;
