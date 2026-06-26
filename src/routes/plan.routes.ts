import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getPlans, purchasePlan, getMySubscription, topUpSubscription, changeTherapist } from "../controllers/plan.controller";

const router = Router();

// Public — get available plans
router.get("/", getPlans);

// Authenticated — purchase a plan (fake payment)
router.post("/purchase", authenticate, purchasePlan);

// Authenticated — top up existing subscription with extra sessions
router.post("/topup", authenticate, topUpSubscription);

// Authenticated — change therapist on current subscription + save survey
router.post("/change-therapist", authenticate, changeTherapist);

// Authenticated — get current user's active subscription
router.get("/my-subscription", authenticate, getMySubscription);

export default router;
