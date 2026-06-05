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

export default router;

// ── Plans ──
router.post("/plans", createPlan);
router.get("/plans", getAdminPlans);
router.patch("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);
