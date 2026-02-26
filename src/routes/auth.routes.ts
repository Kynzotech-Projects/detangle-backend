import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { registerUser, getMe } from "../controllers/auth.controller";

const router = Router();

router.post("/register", authenticate, registerUser);
router.get("/me", authenticate, getMe);

export default router;
