import { Request, Response } from "express";
import { User } from "../models/user.model";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const startOf = (unit: "day" | "week" | "month") => {
    const now = new Date();
    if (unit === "day") {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    if (unit === "week") {
        const day = now.getDay();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    }
    return new Date(now.getFullYear(), now.getMonth(), 1);
};

const monthAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
};

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard
// ---------------------------------------------------------------------------
export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const thisMonthStart = startOf("month");
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // ── User counts ──
        const totalUsers = await User.countDocuments({ registrationStatus: "complete" });
        const usersThisMonth = await User.countDocuments({
            registrationStatus: "complete",
            createdAt: { $gte: thisMonthStart },
        });
        const usersLastMonth = await User.countDocuments({
            registrationStatus: "complete",
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        });

        const usersGrowth =
            usersLastMonth > 0
                ? (((usersThisMonth - usersLastMonth) / usersLastMonth) * 100).toFixed(1)
                : null;

        // ── New users last 7 days (for the Sessions Over Time chart) ──
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            d.setHours(0, 0, 0, 0);
            return d;
        });

        const dailySignups = await Promise.all(
            last7Days.map(async (dayStart) => {
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);
                const count = await User.countDocuments({
                    registrationStatus: "complete",
                    createdAt: { $gte: dayStart, $lt: dayEnd },
                });
                return {
                    label: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
                    value: count,
                };
            })
        );

        // ── Provider breakdown (for mood / provider insights) ──
        const providerBreakdown = await User.aggregate([
            { $match: { registrationStatus: "complete" } },
            { $group: { _id: "$firebaseProvider", count: { $sum: 1 } } },
        ]);

        // ── Gender breakdown ──
        const genderBreakdown = await User.aggregate([
            { $match: { registrationStatus: "complete", gender: { $ne: null } } },
            { $group: { _id: "$gender", count: { $sum: 1 } } },
        ]);

        // ── Recent users ──
        const recentUsers = await User.find({ registrationStatus: "complete" })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("firstName lastName email phoneNumber profilePictureUrl createdAt firebaseProvider");

        // ── Weekly signups for bar chart (last 4 weeks) ──
        const weeklySignups = await Promise.all(
            [3, 2, 1, 0].map(async (weeksAgo) => {
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - (weeksAgo + 1) * 7);
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date();
                weekEnd.setDate(weekEnd.getDate() - weeksAgo * 7);
                weekEnd.setHours(23, 59, 59, 999);
                const count = await User.countDocuments({
                    registrationStatus: "complete",
                    createdAt: { $gte: weekStart, $lte: weekEnd },
                });
                return { label: `W${4 - weeksAgo}`, value: count };
            })
        );

        res.status(200).json({
            stats: {
                totalUsers,
                usersThisMonth,
                usersLastMonth,
                usersGrowthPercent: usersGrowth,
            },
            charts: {
                dailySignups,    // 7-day line chart
                weeklySignups,   // 4-week bar chart
            },
            providerBreakdown,
            genderBreakdown,
            recentUsers,
        });
    } catch (error) {
        console.error("getDashboard error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/users
// ---------------------------------------------------------------------------
export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const search = (req.query.search as string) || "";
        const provider = req.query.provider as string | undefined;
        const status = req.query.status as string | undefined;

        const query: Record<string, unknown> = { registrationStatus: "complete" };

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } },
            ];
        }
        if (provider) query.firebaseProvider = provider;
        if (status === "verified") query.phoneVerified = true;
        if (status === "unverified") query.phoneVerified = false;

        const [users, total] = await Promise.all([
            User.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select("-__v"),
            User.countDocuments(query),
        ]);

        res.status(200).json({
            users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("getUsers error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/users/:id
// ---------------------------------------------------------------------------
export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params.id).select("-__v");
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.status(200).json({ user });
    } catch (error) {
        console.error("getUserById error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id
// ---------------------------------------------------------------------------
export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const allowed = ["firstName", "lastName", "email", "phoneNumber", "gender", "dateOfBirth"];
        const updates: Record<string, unknown> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.status(200).json({ message: "User updated", user });
    } catch (error) {
        console.error("updateUser error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id
// ---------------------------------------------------------------------------
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.status(200).json({ message: "User deleted" });
    } catch (error) {
        console.error("deleteUser error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/stats/growth
// ---------------------------------------------------------------------------
export const getGrowthStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const range = (req.query.range as string) || "7d";
        const days = range === "30d" ? 30 : range === "90d" ? 90 : 7;

        const points = await Promise.all(
            Array.from({ length: days }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (days - 1 - i));
                d.setHours(0, 0, 0, 0);
                const end = new Date(d);
                end.setDate(end.getDate() + 1);
                return User.countDocuments({
                    registrationStatus: "complete",
                    createdAt: { $gte: d, $lt: end },
                }).then((count) => ({
                    date: d.toISOString().split("T")[0],
                    label: d.toLocaleDateString("en-US", {
                        weekday: days <= 7 ? "short" : undefined,
                        month: days > 7 ? "short" : undefined,
                        day: days > 7 ? "numeric" : undefined,
                    }),
                    value: count,
                }));
            })
        );

        res.status(200).json({ range, points });
    } catch (error) {
        console.error("getGrowthStats error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
