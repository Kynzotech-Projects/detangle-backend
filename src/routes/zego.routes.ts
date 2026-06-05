import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getZegoToken } from "../controllers/zego.controller";

const router = Router();

router.post("/token", authenticate, getZegoToken);

export default router;
