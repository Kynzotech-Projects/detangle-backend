import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Therapist } from "../models/therapist.model";
import { Availability } from "../models/availability.model";

// Helper — get therapist from Firebase UID
async function getTherapist(uid: string) {
    const therapist = await Therapist.findOne({ firebaseUid: uid });
    if (!therapist) throw new Error("THERAPIST_NOT_FOUND");
    return therapist;
}

// ---------------------------------------------------------------------------
// GET /api/therapist/availability
// Returns all availability records for the authenticated therapist
// ---------------------------------------------------------------------------
export const getAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const records = await Availability.find({ therapistId: therapist._id })
            .sort({ dayOfWeek: 1 })
            .select("-__v");
        res.status(200).json({ availability: records });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getAvailability error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/therapist/availability
// Create or update availability for a specific day
// Body: { dayOfWeek, date?, slots: [{startTime, endTime}], isRecurring }
// ---------------------------------------------------------------------------
export const saveAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const { dayOfWeek, date, slots, isRecurring } = req.body;

        if (!dayOfWeek) {
            res.status(400).json({ error: "dayOfWeek is required" });
            return;
        }

        if (!Array.isArray(slots) || slots.length === 0) {
            res.status(400).json({ error: "At least one time slot is required" });
            return;
        }

        // Validate slots
        for (const slot of slots) {
            if (!slot.startTime || !slot.endTime) {
                res.status(400).json({ error: "Each slot must have startTime and endTime" });
                return;
            }
            // Validate format HH:mm
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
                res.status(400).json({ error: "Times must be in HH:mm format (24h)" });
                return;
            }
            if (slot.startTime >= slot.endTime) {
                res.status(400).json({ error: "End time must be after start time" });
                return;
            }
        }

        const parsedDate = date ? new Date(date) : null;

        // Upsert the specific record (or the weekly base if no date provided)
        const availability = await Availability.findOneAndUpdate(
            {
                therapistId: therapist._id,
                dayOfWeek,
                date: parsedDate,
            },
            {
                slots,
                isRecurring: isRecurring ?? false,
                isBlocked: false,
            },
            { upsert: true, new: true, runValidators: true }
        );

        // If isRecurring is true, also upsert/update the weekly base record (date: null)
        // This is what gets expanded for all future weeks in the calendar
        if (isRecurring) {
            await Availability.findOneAndUpdate(
                { therapistId: therapist._id, dayOfWeek, date: null },
                { slots, isRecurring: true, isBlocked: false },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({
            message: "Availability saved successfully",
            availability,
        });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("saveAvailability error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/therapist/availability/:id
// ---------------------------------------------------------------------------
export const deleteAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const record = await Availability.findOneAndDelete({
            _id: req.params.id,
            therapistId: therapist._id,
        });
        if (!record) {
            res.status(404).json({ error: "Availability record not found" });
            return;
        }
        res.status(200).json({ message: "Availability deleted" });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("deleteAvailability error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/therapist/availability/calendar?year=2026&month=5
// Returns availability for all dates in the given month (for calendar display)
// ---------------------------------------------------------------------------
export const getCalendarMonth = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const year = Number(req.query.year) || new Date().getFullYear();
        const month = Number(req.query.month) || (new Date().getMonth() + 1);

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);

        // Get specific-date records for this month
        const dateRecords = await Availability.find({
            therapistId: therapist._id,
            date: { $gte: start, $lte: end },
        }).select("-__v");

        // Get recurring records (no specific date) — apply to every matching weekday in month
        const recurringRecords = await Availability.find({
            therapistId: therapist._id,
            isRecurring: true,
            date: null,
        }).select("-__v");

        res.status(200).json({
            dateRecords,    // specific date overrides
            recurringRecords, // weekly repeating
        });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getCalendarMonth error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/therapist/availability/block
// Block or unblock a specific date
// Body: { date, block: true|false }
// ---------------------------------------------------------------------------
export const blockDate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const { date, block } = req.body;

        if (!date) {
            res.status(400).json({ error: "date is required" });
            return;
        }

        const parsedDate = new Date(date);
        const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const dayOfWeek = days[parsedDate.getDay()] as any;

        const record = await Availability.findOneAndUpdate(
            { therapistId: therapist._id, date: parsedDate },
            {
                therapistId: therapist._id,
                date: parsedDate,
                dayOfWeek,
                isBlocked: block !== false,
                slots: [],
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            message: block !== false ? "Date blocked" : "Date unblocked",
            record,
        });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("blockDate error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
