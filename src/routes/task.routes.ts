import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { assignTasks, getMyTasks, markTaskDone, getClientTaskStats } from "../controllers/task.controller";

const router = Router();
router.use(authenticate);

router.post("/", assignTasks);
router.get("/my", getMyTasks);
router.patch("/:id/done", markTaskDone);
router.get("/client/:clientId/stats", getClientTaskStats);

export default router;
