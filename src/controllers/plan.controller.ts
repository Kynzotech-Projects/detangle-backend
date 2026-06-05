import { Request, Response } from "express";
import { Plan } from "../models/plan.model";
import { Subscription } from "../models/subscription.model";
import { User } from "../models/user.model";
import { AuthRequest } from "../middleware/auth.middleware";

// ---------------------------------------------------------------------------
// PUBLIC — GET /api/plans
// ---------------------------------------------------------------------------
export const getPlans = async (_req: Request, res: Response): Promise<void> => {
    try {
        const plans = await Plan.find({ isActive: true })
            .sort({ sortOrder: 1, priceInr: 1 })
            .select("-__v");
        res.status(200).json({ plans });
    } catch (error) {
        console.error("getPlans error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// AUTHENTICATED — POST /api/plans/purchase
// ---------------------------------------------------------------------------
export const purchasePlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { planId, therapistId } = req.body;

        if (!planId) {
            res.status(400).json({ error: "planId is required" });
            return;
        }

        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            res.status(404).json({ error: "Plan not found or inactive" });
            return;
        }

        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        // ── Ensure only one active plan at a time ──
        const existingActive = await Subscription.findOne({
            userId: user._id,
            status: "active",
            expiresAt: { $gt: new Date() },
        });

        if (existingActive) {
            res.status(409).json({ error: "You already have an active plan. Please wait for it to expire or use top-up.", code: "PLAN_ALREADY_ACTIVE" });
            return;
        }

        // ── Fake payment gateway simulation ──
        const fakePaymentId = `PAY_${Date.now()}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

        // Simulate 2-second processing delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // ── Create subscription ──
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.validityDays);

        const subscription = await Subscription.create({
            userId: user._id,
            therapistId: therapistId || undefined,
            planId: plan._id,
            planName: plan.name,
            sessionsTotal: plan.sessions,
            sessionsUsed: 0,
            amountPaid: plan.priceInr,
            paymentId: fakePaymentId,
            paymentStatus: "success",
            status: "active",
            purchasedAt: new Date(),
            expiresAt,
        });

        res.status(201).json({
            message: "Payment successful! Plan activated.",
            subscription,
            payment: {
                id: fakePaymentId,
                amount: plan.priceInr,
                currency: "INR",
                status: "success",
                method: "UPI",
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("purchasePlan error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// AUTHENTICATED — POST /api/plans/topup
// Adds 2 extra sessions to the current active (non-expired) subscription
// Body: { amount } (for payment simulation)
// ---------------------------------------------------------------------------
export const topUpSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        // Find the active subscription that hasn't expired
        const subscription = await Subscription.findOne({
            userId: user._id,
            status: "active",
            expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 });

        if (!subscription) {
            res.status(400).json({ error: "No active subscription to top up" });
            return;
        }

        // Fake payment
        const fakePaymentId = `TOPUP_${Date.now()}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Add 2 sessions
        subscription.sessionsTotal += 2;
        await subscription.save();

        res.status(200).json({
            message: "Top-up successful! 2 sessions added.",
            subscription,
            payment: {
                id: fakePaymentId,
                amount: req.body.amount || 0,
                currency: "INR",
                status: "success",
                method: "UPI",
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("topUpSubscription error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// AUTHENTICATED — GET /api/plans/my-subscription
// ---------------------------------------------------------------------------
export const getMySubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const subscription = await Subscription.findOne({
            userId: user._id,
            status: "active",
            expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 }).populate("therapistId", "firstName lastName licenseType profilePictureUrl specializations");

        if (!subscription) {
            res.status(200).json({ subscription: null, hasActivePlan: false });
            return;
        }

        res.status(200).json({ subscription, hasActivePlan: true });
    } catch (error) {
        console.error("getMySubscription error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// ADMIN — POST /api/admin/plans (create)
// ---------------------------------------------------------------------------
export const createPlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, subtitle, sessions, priceInr, validityDays, sessionDurationMinutes, features, sortOrder } = req.body;

        if (!name || !subtitle || !sessions || !priceInr || !validityDays) {
            res.status(400).json({ error: "name, subtitle, sessions, priceInr, validityDays are required" });
            return;
        }

        const plan = await Plan.create({
            name, subtitle, sessions,
            priceInr: Number(priceInr),
            validityDays: Number(validityDays),
            sessionDurationMinutes: sessionDurationMinutes || 50,
            features: features || [],
            sortOrder: sortOrder || 0,
            isActive: true,
        });

        res.status(201).json({ message: "Plan created", plan });
    } catch (error) {
        console.error("createPlan error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// ADMIN — GET /api/admin/plans
// ---------------------------------------------------------------------------
export const getAdminPlans = async (_req: Request, res: Response): Promise<void> => {
    try {
        const plans = await Plan.find().sort({ sortOrder: 1 }).select("-__v");
        res.status(200).json({ plans });
    } catch (error) {
        console.error("getAdminPlans error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// ADMIN — PATCH /api/admin/plans/:id
// ---------------------------------------------------------------------------
export const updatePlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const allowed = ["name", "subtitle", "sessions", "priceInr", "validityDays", "sessionDurationMinutes", "features", "isActive", "sortOrder"];
        const updates: Record<string, unknown> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const plan = await Plan.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!plan) {
            res.status(404).json({ error: "Plan not found" });
            return;
        }
        res.status(200).json({ message: "Plan updated", plan });
    } catch (error) {
        console.error("updatePlan error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// ADMIN — DELETE /api/admin/plans/:id
// ---------------------------------------------------------------------------
export const deletePlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const plan = await Plan.findByIdAndDelete(req.params.id);
        if (!plan) {
            res.status(404).json({ error: "Plan not found" });
            return;
        }
        res.status(200).json({ message: "Plan deleted" });
    } catch (error) {
        console.error("deletePlan error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
