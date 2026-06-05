import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { User } from "../models/user.model";
import { Therapist } from "../models/therapist.model";
import { Availability } from "../models/availability.model";
import { Subscription } from "../models/subscription.model";
import { Appointment } from "../models/appointment.model";

// Helper
async function getUser(uid: string) {
    const user = await User.findOne({ firebaseUid: uid, registrationStatus: "complete" });
    if (!user) throw new Error("USER_NOT_FOUND");
    return user;
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ---------------------------------------------------------------------------
// GET /api/appointments/available-slots?therapistId=&date=YYYY-MM-DD
// Returns hourly slots by expanding therapist availability for that date
// ---------------------------------------------------------------------------
export const getAvailableSlots = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { therapistId, date } = req.query;

        if (!therapistId || !date) {
            res.status(400).json({ error: "therapistId and date are required" });
            return;
        }

        const therapist = await Therapist.findById(therapistId);
        if (!therapist) {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }

        const parsedDate = new Date(date as string);
        const dayName = DAY_NAMES[parsedDate.getDay()];

        // 1. Look for a specific-date record first (overrides recurring)
        let availabilityRecord = await Availability.findOne({
            therapistId,
            date: { $gte: new Date(parsedDate.setHours(0,0,0,0)), $lt: new Date(parsedDate.setHours(23,59,59,999)) },
        });

        // 2. Fall back to recurring weekly record
        if (!availabilityRecord) {
            availabilityRecord = await Availability.findOne({
                therapistId,
                dayOfWeek: dayName,
                date: null,
                isRecurring: true,
            });
        }

        // 3. No availability or blocked
        if (!availabilityRecord || availabilityRecord.isBlocked || availabilityRecord.slots.length === 0) {
            res.status(200).json({ slots: [], therapist: { firstName: therapist.firstName, lastName: therapist.lastName, licenseType: therapist.licenseType, profilePictureUrl: therapist.profilePictureUrl, specializations: therapist.specializations } });
            return;
        }

        const sessionDuration = therapist.sessionDurationMinutes; // e.g. 60

        // 4. Get already-booked slots for this date
        const targetDate = new Date(date as string);
        const bookedSlots = await Appointment.find({
            therapistId,
            date: {
                $gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
                $lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
            },
            status: { $in: ["pending", "confirmed"] },
        }).select("startTime");

        const bookedTimes = new Set(bookedSlots.map((a) => a.startTime));

        // 5. Expand each slot range into hourly chunks
        const hourlySlots: { startTime: string; endTime: string; available: boolean }[] = [];

        for (const slot of availabilityRecord.slots) {
            const [startH, startM] = slot.startTime.split(":").map(Number);
            const [endH, endM] = slot.endTime.split(":").map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            let current = startMinutes;
            while (current + sessionDuration <= endMinutes) {
                const sh = Math.floor(current / 60);
                const sm = current % 60;
                const eh = Math.floor((current + sessionDuration) / 60);
                const em = (current + sessionDuration) % 60;

                const startStr = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`;
                const endStr = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

                hourlySlots.push({
                    startTime: startStr,
                    endTime: endStr,
                    available: !bookedTimes.has(startStr),
                });

                current += sessionDuration;
            }
        }

        res.status(200).json({
            slots: hourlySlots,
            therapist: {
                firstName: therapist.firstName,
                lastName: therapist.lastName,
                licenseType: therapist.licenseType,
                profilePictureUrl: therapist.profilePictureUrl,
                specializations: therapist.specializations,
            },
        });
    } catch (error) {
        console.error("getAvailableSlots error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/appointments — book a session
// Body: { therapistId, sessionType, date, startTime, endTime }
// ---------------------------------------------------------------------------
export const bookAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await getUser(req.user!.uid);
        const { therapistId, sessionType, date, startTime, endTime } = req.body;

        if (!therapistId || !sessionType || !date || !startTime || !endTime) {
            res.status(400).json({ error: "therapistId, sessionType, date, startTime, endTime are required" });
            return;
        }

        // Validate session type
        if (!["video", "audio", "message"].includes(sessionType)) {
            res.status(400).json({ error: "Invalid sessionType" });
            return;
        }

        // Get active subscription
        const subscription = await Subscription.findOne({
            userId: user._id,
            status: "active",
            expiresAt: { $gt: new Date() },
        });

        if (!subscription) {
            res.status(400).json({ error: "No active subscription. Please purchase a plan first.", code: "NO_SUBSCRIPTION" });
            return;
        }

        if (subscription.sessionsUsed >= subscription.sessionsTotal) {
            res.status(400).json({ error: "No sessions remaining in your plan.", code: "NO_SESSIONS_LEFT" });
            return;
        }

        // Check therapist exists
        const therapist = await Therapist.findById(therapistId);
        if (!therapist) {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }

        const appointmentDate = new Date(date);

        // Check slot not already booked
        const conflict = await Appointment.findOne({
            therapistId,
            date: {
                $gte: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate()),
                $lt: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1),
            },
            startTime,
            status: { $in: ["pending", "confirmed"] },
        });

        if (conflict) {
            res.status(409).json({ error: "This time slot is no longer available. Please choose another.", code: "SLOT_TAKEN" });
            return;
        }

        // Create appointment
        const appointment = await Appointment.create({
            userId: user._id,
            therapistId,
            subscriptionId: subscription._id,
            sessionType,
            date: appointmentDate,
            startTime,
            endTime,
            status: "confirmed",
        });

        // Deduct session from subscription
        subscription.sessionsUsed += 1;
        await subscription.save();

        res.status(201).json({
            message: "Session booked successfully!",
            appointment,
            sessionsRemaining: subscription.sessionsTotal - subscription.sessionsUsed,
        });
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(409).json({ error: "This time slot was just booked. Please choose another.", code: "SLOT_TAKEN" });
            return;
        }
        if (error.message === "USER_NOT_FOUND") {
            res.status(404).json({ error: "User not found" });
            return;
        }
        console.error("bookAppointment error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/appointments/my — client's appointments (upcoming or past)
// Query: ?status=upcoming|past (default: all)
// ---------------------------------------------------------------------------
export const getMyAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await getUser(req.user!.uid);
        const status = req.query.status as string || "all";

        const query: Record<string, unknown> = { userId: user._id };

        if (status === "upcoming") {
            query.status = { $in: ["confirmed", "pending"] };
            query.date = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
        } else if (status === "past") {
            query.$or = [
                { status: "completed" },
                { status: { $in: ["confirmed", "pending"] }, date: { $lt: new Date(new Date().setHours(0, 0, 0, 0)) } },
            ];
        }
        // "all" returns everything

        const appointments = await Appointment.find(query)
            .sort({ date: -1, startTime: -1 })
            .populate("therapistId", "firstName lastName licenseType profilePictureUrl specializations")
            .select("-__v");

        res.status(200).json({ appointments });
    } catch (error) {
        console.error("getMyAppointments error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/appointments/therapist/today  — therapist's sessions today
// GET /api/appointments/therapist/stats  — today count, week count, total clients
// ---------------------------------------------------------------------------

async function getTherapist(uid: string) {
    const t = await Therapist.findOne({ firebaseUid: uid });
    if (!t) throw new Error("THERAPIST_NOT_FOUND");
    return t;
}

export const getTherapistTodaySessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const sessions = await Appointment.find({
            therapistId: therapist._id,
            date: { $gte: todayStart, $lte: todayEnd },
            status: { $in: ["confirmed", "pending"] },
        })
            .sort({ startTime: 1 })
            .populate("userId", "firstName lastName profilePictureUrl firebaseUid")
            .select("-__v");

        res.status(200).json({ sessions });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getTherapistTodaySessions error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getTherapistStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const [todayCount, weekCount, totalClients] = await Promise.all([
            Appointment.countDocuments({
                therapistId: therapist._id,
                date: { $gte: todayStart, $lt: todayEnd },
                status: { $in: ["confirmed", "pending"] },
            }),
            Appointment.countDocuments({
                therapistId: therapist._id,
                date: { $gte: weekStart, $lt: weekEnd },
                status: { $in: ["confirmed", "pending", "completed"] },
            }),
            Appointment.distinct("userId", { therapistId: therapist._id }).then(ids => ids.length),
        ]);

        res.status(200).json({ todayCount, weekCount, totalClients });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getTherapistStats error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/appointments/therapist/all?status=upcoming|completed
// All appointments for the logged-in therapist
// ---------------------------------------------------------------------------
export const getTherapistAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const status = req.query.status as string || "upcoming";
        const now = new Date();

        const query: Record<string, unknown> = { therapistId: therapist._id };

        if (status === "upcoming") {
            query.status = { $in: ["confirmed", "pending"] };
            query.date = { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
        } else {
            query.status = "completed";
        }

        const appointments = await Appointment.find(query)
            .sort({ date: 1, startTime: 1 })
            .populate("userId", "firstName lastName profilePictureUrl firebaseUid")
            .select("-__v");

        res.status(200).json({ appointments });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getTherapistAppointments error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/appointments/:id/details — full appointment + client info for therapist
// ---------------------------------------------------------------------------
export const getAppointmentDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);

        const appointment = await Appointment.findOne({
            _id: req.params.id,
            therapistId: therapist._id,
        })
            .populate("userId", "firstName lastName profilePictureUrl gender dateOfBirth firebaseUid")
            .select("-__v");

        if (!appointment) {
            res.status(404).json({ error: "Appointment not found" });
            return;
        }

        res.status(200).json({ appointment });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getAppointmentDetails error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:id/complete — mark session as completed
// ---------------------------------------------------------------------------
export const completeAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            res.status(404).json({ error: "Appointment not found" });
            return;
        }
        if (appointment.status === "completed") {
            res.status(200).json({ message: "Already completed", appointment });
            return;
        }
        appointment.status = "completed" as any;
        await appointment.save();
        res.status(200).json({ message: "Session marked as completed", appointment });
    } catch (error) {
        console.error("completeAppointment error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/appointments/:id/review — submit a rating/review
// Body: { rating (1-5), comment? }
// ---------------------------------------------------------------------------
export const submitReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await getUser(req.user!.uid);
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ error: "rating must be between 1 and 5" });
            return;
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            res.status(404).json({ error: "Appointment not found" });
            return;
        }

        const { Review } = await import("../models/review.model");

        // Upsert — allow updating
        const review = await Review.findOneAndUpdate(
            { appointmentId: appointment._id },
            {
                userId: user._id,
                therapistId: appointment.therapistId,
                appointmentId: appointment._id,
                rating: Number(rating),
                comment: comment || null,
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Review submitted", review });
    } catch (error: any) {
        if (error.message === "USER_NOT_FOUND") {
            res.status(404).json({ error: "User not found" });
            return;
        }
        if (error.code === 11000) {
            res.status(200).json({ message: "Review already submitted" });
            return;
        }
        console.error("submitReview error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
