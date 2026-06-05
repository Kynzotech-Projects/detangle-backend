import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getAvailableSlots, bookAppointment, getMyAppointments, getTherapistTodaySessions, getTherapistStats, getTherapistAppointments, getAppointmentDetails, completeAppointment, submitReview } from "../controllers/appointment.controller";

const router = Router();
router.use(authenticate);

router.get("/available-slots", getAvailableSlots);
router.post("/", bookAppointment);
router.get("/my", getMyAppointments);
router.get("/therapist/today", getTherapistTodaySessions);
router.get("/therapist/stats", getTherapistStats);
router.get("/therapist/all", getTherapistAppointments);
router.get("/:id/details", getAppointmentDetails);
router.patch("/:id/complete", completeAppointment);
router.post("/:id/review", submitReview);

export default router;
