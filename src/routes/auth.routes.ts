import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
    initiateRegistration,
    verifyOtpAndCompleteRegistration,
    loginWithPhone,
    googleSignIn,
    appleSignIn,
    checkSession,
    updateProfile,
    getMe,
} from "../controllers/auth.controller";

const router = Router();

// Phone registration (2-step)
router.post("/register/initiate", initiateRegistration);
router.post("/register/verify-otp", authenticate, verifyOtpAndCompleteRegistration);

// Login — single phone OTP endpoint handles both clients and therapists
router.post("/login/phone", authenticate, loginWithPhone);

// Session restore
router.get("/session", authenticate, checkSession);

// Social sign-in
router.post("/google", authenticate, googleSignIn);
router.post("/apple", authenticate, appleSignIn);

// Profile
router.get("/me", authenticate, getMe);
router.patch("/profile", authenticate, updateProfile);

export default router;
