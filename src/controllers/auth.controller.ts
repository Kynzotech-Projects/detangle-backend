import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { User } from "../models/user.model";
import { admin } from "../config/firebase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split a full name string into firstName / lastName. */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ") || parts[0]; // fallback: repeat first name
    return { firstName, lastName };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register/initiate
// ---------------------------------------------------------------------------
/**
 * Step 1 of phone-based registration.
 *
 * The client collects all profile data and sends it here BEFORE OTP verification.
 * We create a "pending_otp" user record so the data is persisted.
 * The client then triggers Firebase phone auth (sendVerificationCode) on-device
 * and calls /register/verify-otp once the user enters the OTP.
 *
 * Body:
 *   fullName          string   required
 *   email             string   required
 *   phoneNumber       string   required  (E.164 format, e.g. +919876543210)
 *   isTermsAccepted   boolean  required  (must be true)
 *   profilePictureUrl string   optional  (Firebase Storage URL)
 *   gender            string   optional  ("male" | "female" | "non-binary" | "prefer-not-to-say")
 *   dateOfBirth       string   optional  (ISO 8601 date, e.g. "1995-06-15")
 *   location          object   optional  { latitude, longitude, city? }
 */
export const initiateRegistration = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const {
            fullName,
            email,
            phoneNumber,
            isTermsAccepted,
            profilePictureUrl,
            gender,
            dateOfBirth,
            location,
        } = req.body;

        // --- Validation ---
        if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
            res.status(400).json({ error: "fullName is required" });
            return;
        }

        if (!email || typeof email !== "string") {
            res.status(400).json({ error: "email is required" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            res.status(400).json({ error: "Invalid email format" });
            return;
        }

        if (!phoneNumber || typeof phoneNumber !== "string") {
            res.status(400).json({ error: "phoneNumber is required (E.164 format)" });
            return;
        }

        const phoneRegex = /^\+[1-9]\d{6,14}$/;
        if (!phoneRegex.test(phoneNumber.trim())) {
            res.status(400).json({
                error: "phoneNumber must be in E.164 format (e.g. +919876543210)",
            });
            return;
        }

        if (!isTermsAccepted) {
            res.status(400).json({ error: "You must accept the terms and conditions" });
            return;
        }

        // --- Duplicate checks ---
        const existingEmail = await User.findOne({
            email: email.trim().toLowerCase(),
            registrationStatus: "complete",
        });
        if (existingEmail) {
            res.status(409).json({ error: "An account with this email already exists" });
            return;
        }

        const existingPhone = await User.findOne({
            phoneNumber: phoneNumber.trim(),
            registrationStatus: "complete",
        });
        if (existingPhone) {
            res.status(409).json({ error: "An account with this phone number already exists" });
            return;
        }

        // --- Remove any stale pending record for this phone ---
        await User.deleteOne({
            phoneNumber: phoneNumber.trim(),
            registrationStatus: "pending_otp",
        });

        const { firstName, lastName } = splitFullName(fullName);

        // --- Create pending user ---
        // firebaseUid is a placeholder; it will be replaced after OTP verification.
        // We use a temp value so the unique index doesn't block creation.
        const tempUid = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const user = await User.create({
            firebaseUid: tempUid,
            firebaseProvider: "phone",
            emailVerified: false,
            phoneVerified: false,
            registrationStatus: "pending_otp",
            firstName,
            lastName,
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender: gender || undefined,
            profilePictureUrl: profilePictureUrl || undefined,
            location: location || undefined,
            isTermsAccepted: true,
            termsAcceptedAt: new Date(),
        });

        res.status(201).json({
            message: "Registration initiated. Please verify your phone number via OTP.",
            pendingUserId: user._id,
            phoneNumber: user.phoneNumber,
        });
    } catch (error) {
        console.error("initiateRegistration error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/auth/register/verify-otp
// ---------------------------------------------------------------------------
/**
 * Step 2 of phone-based registration.
 *
 * After the user enters the OTP in the app, Firebase SDK signs them in and
 * returns a Firebase ID token. The client sends that token here.
 * We verify it, extract the real UID, and finalize the user record.
 *
 * Headers:
 *   Authorization: Bearer <firebase-phone-id-token>
 *
 * Body:
 *   pendingUserId   string   required  (returned by /register/initiate)
 */
export const verifyOtpAndCompleteRegistration = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { pendingUserId } = req.body;

        if (!pendingUserId) {
            res.status(400).json({ error: "pendingUserId is required" });
            return;
        }

        const { uid, phone_number, firebase } = req.user!;

        // Find the pending record
        const pendingUser = await User.findById(pendingUserId);
        if (!pendingUser) {
            res.status(404).json({ error: "Pending registration not found" });
            return;
        }

        if (pendingUser.registrationStatus === "complete") {
            res.status(200).json({ message: "User already registered", user: pendingUser });
            return;
        }

        // Ensure the verified phone matches what was submitted
        if (phone_number && pendingUser.phoneNumber !== phone_number) {
            res.status(400).json({
                error: "Phone number mismatch between OTP token and registration data",
            });
            return;
        }

        // Check if this Firebase UID is already tied to another account
        const existingUid = await User.findOne({ firebaseUid: uid });
        if (existingUid && existingUid._id.toString() !== pendingUserId) {
            res.status(409).json({ error: "This phone number is already registered" });
            return;
        }

        // Finalize the user
        pendingUser.firebaseUid = uid;
        pendingUser.firebaseProvider =
            (firebase?.sign_in_provider as any) || "phone";
        pendingUser.phoneVerified = true;
        pendingUser.registrationStatus = "complete";
        await pendingUser.save();

        res.status(200).json({
            message: "Phone verified. Registration complete.",
            user: pendingUser,
        });
    } catch (error) {
        console.error("verifyOtpAndCompleteRegistration error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/auth/google
// ---------------------------------------------------------------------------
/**
 * Google Sign-In (and future Apple Sign-In follows the same pattern).
 *
 * The client completes Google OAuth via Firebase SDK and sends the resulting
 * Firebase ID token. We upsert the user in MongoDB.
 *
 * Headers:
 *   Authorization: Bearer <firebase-google-id-token>
 *
 * Body (only required on first sign-in if profile data is missing from Google):
 *   isTermsAccepted   boolean  required on first sign-in
 *   dateOfBirth       string   optional
 *   gender            string   optional
 *   phoneNumber       string   optional
 *   location          object   optional
 */
export const googleSignIn = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { uid, email, name, picture, email_verified, firebase } = req.user!;

        let user = await User.findOne({ firebaseUid: uid });

        if (user) {
            // Returning user — just return their profile
            res.status(200).json({ message: "Sign-in successful", user, isNewUser: false });
            return;
        }

        // New user via Google — require terms acceptance
        const {
            isTermsAccepted,
            dateOfBirth,
            gender,
            phoneNumber,
            location,
        } = req.body;

        if (!isTermsAccepted) {
            res.status(400).json({
                error: "You must accept the terms and conditions",
                requiresTerms: true,
            });
            return;
        }

        // Split display name from Google
        const { firstName, lastName } = splitFullName(name || email || "User");

        user = await User.create({
            firebaseUid: uid,
            firebaseProvider: (firebase?.sign_in_provider as any) || "google.com",
            emailVerified: email_verified ?? false,
            phoneVerified: false,
            registrationStatus: "complete",
            firstName,
            lastName,
            email: email?.toLowerCase(),
            phoneNumber: phoneNumber || undefined,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender: gender || undefined,
            profilePictureUrl: picture || undefined,
            location: location || undefined,
            isTermsAccepted: true,
            termsAcceptedAt: new Date(),
        });

        res.status(201).json({ message: "Account created via Google", user, isNewUser: true });
    } catch (error) {
        console.error("googleSignIn error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/auth/apple  (placeholder — ready for future implementation)
// ---------------------------------------------------------------------------
/**
 * Apple Sign-In — same flow as Google.
 * Apple may not return the user's name after the first sign-in,
 * so the client should cache and send it on first sign-in.
 *
 * Headers:
 *   Authorization: Bearer <firebase-apple-id-token>
 *
 * Body (first sign-in only):
 *   fullName          string   optional  (Apple only provides this once)
 *   isTermsAccepted   boolean  required on first sign-in
 *   dateOfBirth       string   optional
 *   gender            string   optional
 */
export const appleSignIn = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { uid, email, email_verified, firebase } = req.user!;

        let user = await User.findOne({ firebaseUid: uid });

        if (user) {
            res.status(200).json({ message: "Sign-in successful", user, isNewUser: false });
            return;
        }

        const { fullName, isTermsAccepted, dateOfBirth, gender, phoneNumber, location } =
            req.body;

        if (!isTermsAccepted) {
            res.status(400).json({
                error: "You must accept the terms and conditions",
                requiresTerms: true,
            });
            return;
        }

        const { firstName, lastName } = splitFullName(fullName || email || "User");

        user = await User.create({
            firebaseUid: uid,
            firebaseProvider: (firebase?.sign_in_provider as any) || "apple.com",
            emailVerified: email_verified ?? false,
            phoneVerified: false,
            registrationStatus: "complete",
            firstName,
            lastName,
            email: email?.toLowerCase(),
            phoneNumber: phoneNumber || undefined,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender: gender || undefined,
            location: location || undefined,
            isTermsAccepted: true,
            termsAcceptedAt: new Date(),
        });

        res.status(201).json({ message: "Account created via Apple", user, isNewUser: true });
    } catch (error) {
        console.error("appleSignIn error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
/**
 * Phone-based sign-in for existing users.
 *
 * The client completes Firebase phone auth (OTP) and sends the resulting
 * Firebase ID token. We verify it and return the user's profile.
 * Returns 404 if the phone number is not registered.
 *
 * Headers:
 *   Authorization: Bearer <firebase-phone-id-token>
 */
export const loginWithPhone = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { uid, phone_number } = req.user!;

        // ── Check if this is a therapist first ──
        const { Therapist } = await import("../models/therapist.model");
        let therapist = await Therapist.findOne({ phoneNumber: phone_number, status: { $ne: "suspended" } });
        if (!therapist) {
            // Also try by Firebase UID (returning therapist with same device)
            therapist = await Therapist.findOne({ firebaseUid: uid, status: { $ne: "suspended" } });
        }

        if (therapist) {
            if (therapist.status === "suspended") {
                res.status(403).json({
                    error: "Your account has been suspended. Please contact support.",
                    code: "ACCOUNT_SUSPENDED",
                });
                return;
            }
            // Sync Firebase UID if needed
            if (therapist.firebaseUid !== uid) {
                therapist.firebaseUid = uid;
                await therapist.save();
            }
            res.status(200).json({
                message: "Sign-in successful",
                role: "therapist",
                therapist,
                isNewUser: false,
            });
            return;
        }

        // ── Otherwise look up as a client ──
        let user = await User.findOne({ firebaseUid: uid, registrationStatus: "complete" });

        if (!user && phone_number) {
            user = await User.findOne({ phoneNumber: phone_number, registrationStatus: "complete" });
            if (user) {
                user.firebaseUid = uid;
                await user.save();
            }
        }

        if (!user) {
            res.status(404).json({
                error: "No account found with this phone number. Please sign up first.",
                code: "USER_NOT_FOUND",
            });
            return;
        }

        res.status(200).json({
            message: "Sign-in successful",
            role: "client",
            user,
            isNewUser: false,
        });
    } catch (error) {
        console.error("loginWithPhone error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/auth/session
// ---------------------------------------------------------------------------
/**
 * Restore session — checks if the authenticated user is a client or therapist.
 * Used on app restart to determine where to route.
 * Headers: Authorization: Bearer <firebase-id-token>
 */
export const checkSession = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid, phone_number } = req.user!;

        // Check therapist first
        const { Therapist } = await import("../models/therapist.model");
        let therapist = await Therapist.findOne({ firebaseUid: uid });
        if (!therapist && phone_number) {
            therapist = await Therapist.findOne({ phoneNumber: phone_number });
        }

        if (therapist && therapist.status !== "suspended") {
            if (therapist.firebaseUid !== uid) {
                therapist.firebaseUid = uid;
                await therapist.save();
            }
            res.status(200).json({
                authenticated: true,
                role: "therapist",
                therapist,
            });
            return;
        }

        // Check client
        let user = await User.findOne({ firebaseUid: uid, registrationStatus: "complete" });
        if (!user && phone_number) {
            user = await User.findOne({ phoneNumber: phone_number, registrationStatus: "complete" });
            if (user) {
                user.firebaseUid = uid;
                await user.save();
            }
        }

        if (user) {
            res.status(200).json({
                authenticated: true,
                role: "client",
                user,
            });
            return;
        }

        res.status(200).json({ authenticated: false, role: null });
    } catch (error) {
        console.error("checkSession error:", error);
        res.status(200).json({ authenticated: false, role: null });
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/auth/profile
// ---------------------------------------------------------------------------
/**
 * Update the current user's profile fields.
 * Headers: Authorization: Bearer <firebase-id-token>
 * Body: { firstName?, lastName?, gender?, dateOfBirth?, profilePictureUrl?, phoneNumber? }
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const allowed = ["firstName", "lastName", "gender", "dateOfBirth", "profilePictureUrl", "phoneNumber"];
        const updates: Record<string, unknown> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const user = await User.findOneAndUpdate(
            { firebaseUid: req.user!.uid },
            updates,
            { new: true, runValidators: true }
        );

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({ message: "Profile updated", user });
    } catch (error) {
        console.error("updateProfile error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
/**
 * Returns the current authenticated user's profile.
 * Headers: Authorization: Bearer <firebase-id-token>
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("getMe error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
