import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Therapist } from "../models/therapist.model";
import { Appointment } from "../models/appointment.model";
import { Subscription } from "../models/subscription.model";
import { User } from "../models/user.model";
import mongoose from "mongoose";

async function getTherapist(uid: string) {
    const t = await Therapist.findOne({ firebaseUid: uid });
    if (!t) throw new Error("THERAPIST_NOT_FOUND");
    return t;
}

// ---------------------------------------------------------------------------
// GET /api/therapist/clients
// Returns unique clients of this therapist with session counts and remaining sessions
// Query: page, limit, search
// ---------------------------------------------------------------------------
export const getTherapistClients = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
        const search = (req.query.search as string) || "";

        // Get distinct userId list from appointments for this therapist
        const userIds: mongoose.Types.ObjectId[] = await Appointment.distinct("userId", {
            therapistId: therapist._id,
        });

        // Build user query
        const userQuery: Record<string, unknown> = {
            _id: { $in: userIds },
            registrationStatus: "complete",
        };

        if (search) {
            userQuery.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
            ];
        }

        const [users, total] = await Promise.all([
            User.find(userQuery)
                .sort({ firstName: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select("_id firstName lastName profilePictureUrl firebaseUid"),
            User.countDocuments(userQuery),
        ]);

        // For each user, get total sessions completed + last session date + remaining sessions
        const clientData = await Promise.all(
            users.map(async (u) => {
                const [totalSessions, lastAppt, activeSub] = await Promise.all([
                    Appointment.countDocuments({
                        therapistId: therapist._id,
                        userId: u._id,
                    }),
                    Appointment.findOne({
                        therapistId: therapist._id,
                        userId: u._id,
                        status: { $in: ["confirmed", "completed"] },
                    }).sort({ date: -1 }).select("date"),
                    Subscription.findOne({
                        userId: u._id,
                        status: "active",
                        expiresAt: { $gt: new Date() },
                    }).select("sessionsTotal sessionsUsed"),
                ]);

                const remaining = activeSub
                    ? activeSub.sessionsTotal - activeSub.sessionsUsed
                    : 0;

                // Human-readable last session label
                let lastLabel = "Never";
                if (lastAppt?.date) {
                    const diff = Math.floor(
                        (Date.now() - new Date(lastAppt.date).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (diff === 0) lastLabel = "Today";
                    else if (diff === 1) lastLabel = "Yesterday";
                    else if (diff < 7) lastLabel = `${diff} days ago`;
                    else if (diff < 14) lastLabel = "1 week ago";
                    else lastLabel = `${Math.floor(diff / 7)} weeks ago`;
                }

                return {
                    id: u._id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    profilePictureUrl: u.profilePictureUrl,
                    firebaseUid: u.get("firebaseUid"),
                    totalSessions,
                    remaining,
                    lastSession: lastLabel,
                };
            })
        );

        res.status(200).json({
            clients: clientData,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getTherapistClients error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/therapist/clients/:clientId — full client profile for therapist
// ---------------------------------------------------------------------------
export const getClientProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const clientId = req.params.clientId;

        const user = await User.findById(clientId).select("firstName lastName profilePictureUrl gender dateOfBirth");
        if (!user) {
            res.status(404).json({ error: "Client not found" });
            return;
        }

        const [completedSessions, activeSub] = await Promise.all([
            Appointment.countDocuments({
                therapistId: therapist._id,
                userId: clientId,
                status: "completed",
            }),
            Subscription.findOne({
                userId: clientId,
                status: "active",
                expiresAt: { $gt: new Date() },
            }).select("sessionsTotal sessionsUsed"),
        ]);

        const remaining = activeSub ? activeSub.sessionsTotal - activeSub.sessionsUsed : 0;

        res.status(200).json({
            client: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePictureUrl: user.profilePictureUrl,
                gender: user.gender,
                dateOfBirth: user.dateOfBirth,
                completedSessions,
                remaining,
            },
        });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getClientProfile error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/therapist/clients/:clientId/sessions — session history for a client
// ---------------------------------------------------------------------------
export const getClientSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const clientId = req.params.clientId;

        const sessions = await Appointment.find({
            therapistId: therapist._id,
            userId: clientId,
            status: "completed",
        })
            .sort({ date: -1 })
            .select("sessionType date startTime endTime status")
            .limit(20);

        res.status(200).json({ sessions });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getClientSessions error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/therapist/clients/:clientId/mood — client's weekly mood for therapist
// ---------------------------------------------------------------------------
export const getClientMood = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await getTherapist(req.user!.uid);
        const clientId = req.params.clientId;

        // Get mood for last 7 days
        const { MoodLog } = await import("../models/mood.model");
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const moods = await MoodLog.find({
            userId: clientId,
            loggedDate: { $gte: weekAgo.toISOString().split('T')[0], $lte: now.toISOString().split('T')[0] },
        }).sort({ loggedDate: 1 }).select("mood loggedDate");

        res.status(200).json({ moods });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("getClientMood error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
