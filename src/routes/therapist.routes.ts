import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
    getAvailability,
    saveAvailability,
    deleteAvailability,
    getCalendarMonth,
    blockDate,
} from "../controllers/availability.controller";
import { getTherapistClients, getClientProfile, getClientSessions, getClientMood } from "../controllers/therapist.clients.controller";

const router = Router();
router.use(authenticate);

router.get("/availability", getAvailability);
router.get("/availability/calendar", getCalendarMonth);
router.post("/availability", saveAvailability);
router.post("/availability/block", blockDate);
router.delete("/availability/:id", deleteAvailability);

router.get("/clients", getTherapistClients);
router.get("/clients/:clientId", getClientProfile);
router.get("/clients/:clientId/sessions", getClientSessions);
router.get("/clients/:clientId/mood", getClientMood);

export default router;
