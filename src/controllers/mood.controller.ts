import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { User } from "../models/user.model";
import { MoodLog } from "../models/mood.model";

function todayStr(): string {
    return new Date().toISOString().split("T")[0];
}

async function getUser(uid: string) {
    const u = await User.findOne({ firebaseUid: uid, registrationStatus: "complete" });
    if (!u) throw new Error("USER_NOT_FOUND");
    return u;
}

// ---------------------------------------------------------------------------
// GET /api/mood/today — check if user already logged mood today
// ---------------------------------------------------------------------------
export const getTodayMood = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await getUser(req.user!.uid);
        const log = await MoodLog.findOne({ userId: user._id, loggedDate: todayStr() });
        res.status(200).json({
            loggedToday: !!log,
            mood: log ? log.mood : null,
            influences: log ? log.influences : [],
        });
    } catch (error: any) {
        if (error.message === "USER_NOT_FOUND") {
            res.status(404).json({ error: "User not found" });
            return;
        }
        console.error("getTodayMood error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/mood — save today's mood (once per day)
// Body: { mood, influences[] }
// ---------------------------------------------------------------------------
export const saveMood = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await getUser(req.user!.uid);
        const { mood, influences } = req.body;

        if (!mood) {
            res.status(400).json({ error: "mood is required" });
            return;
        }

        const today = todayStr();

        // Upsert — allow updating same day's mood
        const log = await MoodLog.findOneAndUpdate(
            { userId: user._id, loggedDate: today },
            { mood, influences: influences || [], loggedDate: today },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Mood logged successfully", log });
    } catch (error: any) {
        if (error.message === "USER_NOT_FOUND") {
            res.status(404).json({ error: "User not found" });
            return;
        }
        console.error("saveMood error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/mood/history — last 30 days of mood logs
// ---------------------------------------------------------------------------
export const getMoodHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await getUser(req.user!.uid);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const fromDate = thirtyDaysAgo.toISOString().split("T")[0];

        const logs = await MoodLog.find({
            userId: user._id,
            loggedDate: { $gte: fromDate },
        }).sort({ loggedDate: -1 }).select("-__v");

        res.status(200).json({ logs });
    } catch (error: any) {
        if (error.message === "USER_NOT_FOUND") {
            res.status(404).json({ error: "User not found" });
            return;
        }
        console.error("getMoodHistory error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
