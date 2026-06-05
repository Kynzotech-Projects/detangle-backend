import { Router, Request, Response } from "express";
import { Therapist } from "../models/therapist.model";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/therapists
// Public — paginated list of active therapists for client browse
// Query: page, limit, search, specialization, language
// ---------------------------------------------------------------------------
router.get("/therapists", async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
        const search = (req.query.search as string) || "";
        const specialization = req.query.specialization as string | undefined;
        const language = req.query.language as string | undefined;

        const query: Record<string, unknown> = { status: "active" };

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { specializations: { $elemMatch: { $regex: search, $options: "i" } } },
                { city: { $regex: search, $options: "i" } },
            ];
        }
        if (specialization) {
            query.specializations = { $in: [new RegExp(specialization, "i")] };
        }
        if (language) {
            query.languagesSpoken = { $in: [new RegExp(language, "i")] };
        }

        const [therapists, total] = await Promise.all([
            Therapist.find(query)
                .sort({ yearsOfExperience: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select(
                    "firstName lastName licenseType specializations languagesSpoken " +
                    "profilePictureUrl city state consultationFee sessionDurationMinutes " +
                    "yearsOfExperience bio offersOnline offersInPerson"
                ),
            Therapist.countDocuments(query),
        ]);

        res.status(200).json({
            therapists,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        });
    } catch (error) {
        console.error("getTherapists public error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ---------------------------------------------------------------------------
// GET /api/therapists/:id
// Public — full therapist profile for the detail screen
// ---------------------------------------------------------------------------
router.get("/therapists/:id", async (req: Request, res: Response): Promise<void> => {
    try {
        const therapist = await Therapist.findOne({
            _id: req.params.id,
            status: "active",
        }).select(
            "firstName lastName licenseType specializations languagesSpoken " +
            "profilePictureUrl city state consultationFee sessionDurationMinutes " +
            "yearsOfExperience bio offersOnline offersInPerson " +
            "highestDegree university graduationYear registrationCouncil"
        );

        if (!therapist) {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }

        res.status(200).json({ therapist });
    } catch (error) {
        console.error("getTherapistDetail error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
