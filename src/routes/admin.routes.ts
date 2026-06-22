import { Router } from "express";
import { adminAuth } from "../middleware/admin.middleware";
import {
    getDashboard,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    getGrowthStats,
} from "../controllers/admin.controller";
import {
    createTherapist,
    getTherapists,
    getTherapistById,
    updateTherapist,
    deleteTherapist,
    resendCredentials,
} from "../controllers/therapist.controller";
import {
    createPlan,
    getAdminPlans,
    updatePlan,
    deletePlan,
} from "../controllers/plan.controller";

const router = Router();

// All admin routes protected
router.use(adminAuth);

// ── Dashboard ──
router.get("/dashboard", getDashboard);
router.get("/stats/growth", getGrowthStats);

// ── Users (clients) ──
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// ── Therapists ──
router.post("/therapists", createTherapist);
router.get("/therapists", getTherapists);
router.get("/therapists/:id", getTherapistById);
router.patch("/therapists/:id", updateTherapist);
router.delete("/therapists/:id", deleteTherapist);
router.post("/therapists/:id/resend-credentials", resendCredentials);

// ── Plans ──
router.post("/plans", createPlan);
router.get("/plans", getAdminPlans);
router.patch("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);

// ── Sessions (all appointments) ──
router.get("/sessions", async (req, res) => {
    try {
        const { Appointment } = await import("../models/appointment.model");
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));
        const status = req.query.status as string || "all";

        const query: Record<string, unknown> = {};
        if (status !== "all") query.status = status;

        const [sessions, total] = await Promise.all([
            Appointment.find(query)
                .sort({ date: -1, startTime: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("userId", "firstName lastName")
                .populate("therapistId", "firstName lastName")
                .select("-__v"),
            Appointment.countDocuments(query),
        ]);

        res.json({ sessions, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error("admin sessions error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── Mood Insights (aggregated) ──
router.get("/mood-insights", async (_req, res) => {
    try {
        const { MoodLog } = await import("../models/mood.model");

        const [totalLogs, moodBreakdown, recentLogs] = await Promise.all([
            MoodLog.countDocuments({}),
            MoodLog.aggregate([
                { $group: { _id: "$mood", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            MoodLog.find({})
                .sort({ loggedDate: -1 })
                .limit(20)
                .populate("userId", "firstName lastName")
                .select("mood loggedDate influences")
                .lean(),
        ]);

        res.json({ totalLogs, moodBreakdown, recentLogs });
    } catch (error) {
        console.error("admin mood-insights error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
