import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { User } from "../models/user.model";

/**
 * POST /api/auth/register
 * Creates or returns an existing user in MongoDB after Firebase auth.
 * Expects body: { firstName, lastName, dateOfBirth, gender, phoneNumber,
 *                 password, isTermsAccepted, location: { latitude, longitude, city } }
 */
export const registerUser = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { uid, email, picture, email_verified, firebase } = req.user!;

        // Check if user already exists
        let user = await User.findOne({ firebaseUid: uid });

        if (user) {
            res.status(200).json({ message: "User already exists", user });
            return;
        }

        const {
            firstName,
            lastName,
            dateOfBirth,
            gender,
            phoneNumber,
            password,
            isTermsAccepted,
            location,
            profilePictureUrl,
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName) {
            res.status(400).json({ error: "First name and last name are required" });
            return;
        }

        if (!isTermsAccepted) {
            res.status(400).json({ error: "You must accept the terms and conditions" });
            return;
        }

        user = await User.create({
            firebaseUid: uid,
            firebaseProvider: firebase?.sign_in_provider || undefined,
            emailVerified: email_verified || false,
            firstName,
            lastName,
            email,
            phoneNumber: phoneNumber || undefined,
            password: password || undefined,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender: gender || undefined,
            profilePictureUrl: profilePictureUrl || picture || undefined,
            location: location || undefined,
            isTermsAccepted,
            termsAcceptedAt: isTermsAccepted ? new Date() : undefined,
        });

        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile.
 */
export const getMe = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("GetMe error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
