import { Request, Response } from "express";
import { Therapist } from "../models/therapist.model";
import { User } from "../models/user.model";
import { sendTherapistWelcomeEmail } from "../services/email.service";

// ---------------------------------------------------------------------------
// POST /api/admin/therapists
// ---------------------------------------------------------------------------
export const createTherapist = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            firstName, lastName, email, phoneNumber, gender, dateOfBirth,
            profilePictureUrl, city, state,
            licenseType, registrationNumber, registrationCouncil,
            registrationExpiryDate, yearsOfExperience, specializations, languagesSpoken,
            highestDegree, university, graduationYear,
            bio, consultationFee, sessionDurationMinutes, offersOnline, offersInPerson,
        } = req.body;

        // ── Validation ──
        const required: [string, unknown][] = [
            ["firstName", firstName], ["lastName", lastName], ["email", email],
            ["phoneNumber", phoneNumber], ["gender", gender], ["dateOfBirth", dateOfBirth],
            ["city", city], ["state", state],
            ["licenseType", licenseType], ["registrationNumber", registrationNumber],
            ["registrationCouncil", registrationCouncil],
            ["yearsOfExperience", yearsOfExperience],
            ["highestDegree", highestDegree], ["university", university], ["graduationYear", graduationYear],
            ["bio", bio], ["consultationFee", consultationFee],
        ];
        for (const [field, val] of required) {
            if (val === undefined || val === null || val === "") {
                res.status(400).json({ error: `${field} is required` });
                return;
            }
        }

        if (!Array.isArray(specializations) || specializations.length === 0) {
            res.status(400).json({ error: "At least one specialization is required" });
            return;
        }
        if (!Array.isArray(languagesSpoken) || languagesSpoken.length === 0) {
            res.status(400).json({ error: "At least one language is required" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ error: "Invalid email format" });
            return;
        }

        const phoneRegex = /^\+[1-9]\d{6,14}$/;
        if (!phoneRegex.test(phoneNumber.trim())) {
            res.status(400).json({ error: "phoneNumber must be in E.164 format (e.g. +919876543210)" });
            return;
        }

        // ── Duplicate checks ──
        const existingEmail = await Therapist.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            res.status(409).json({ error: "A therapist with this email already exists" });
            return;
        }

        const existingPhone = await Therapist.findOne({ phoneNumber: phoneNumber.trim() });
        if (existingPhone) {
            res.status(409).json({ error: "A therapist with this phone number already exists" });
            return;
        }

        // ── Block if phone is already registered as a client ──
        const existingClientPhone = await User.findOne({
            phoneNumber: phoneNumber.trim(),
            registrationStatus: "complete",
        });
        if (existingClientPhone) {
            res.status(409).json({
                error: "This phone number is already registered as a client account. A user cannot be both a client and a therapist.",
                code: "PHONE_IS_CLIENT",
            });
            return;
        }

        // ── Create MongoDB record (no Firebase Auth — phone OTP handles auth) ──
        const therapist = await Therapist.create({
            firebaseUid: `therapist_${Date.now()}_${Math.random().toString(36).slice(2)}`, // placeholder, updated on first login
            email: email.toLowerCase(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phoneNumber: phoneNumber.trim(),
            gender,
            dateOfBirth: new Date(dateOfBirth),
            profilePictureUrl: (profilePictureUrl && profilePictureUrl.startsWith("http")) ? profilePictureUrl : undefined,
            city: city.trim(),
            state: state.trim(),
            licenseType,
            registrationNumber: registrationNumber.trim(),
            registrationCouncil: registrationCouncil.trim(),
            registrationExpiryDate: registrationExpiryDate ? new Date(registrationExpiryDate) : undefined,
            yearsOfExperience: Number(yearsOfExperience),
            specializations,
            languagesSpoken,
            highestDegree: highestDegree.trim(),
            university: university.trim(),
            graduationYear: Number(graduationYear),
            bio: bio.trim(),
            consultationFee: Number(consultationFee),
            sessionDurationMinutes: sessionDurationMinutes || 60,
            offersOnline: offersOnline !== false,
            offersInPerson: offersInPerson === true,
            status: "active",
            verifiedByAdmin: true,
            verifiedAt: new Date(),
        });

        // ── Send welcome email ──
        try {
            await sendTherapistWelcomeEmail({
                to: email.toLowerCase(),
                firstName,
                lastName,
                phoneNumber: phoneNumber.trim(),
            });
        } catch (emailErr) {
            console.error("Failed to send welcome email:", emailErr);
        }

        res.status(201).json({
            message: "Therapist created successfully. Welcome email sent.",
            therapist,
        });
    } catch (error) {
        console.error("createTherapist error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/therapists
// ---------------------------------------------------------------------------
export const getTherapists = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const search = (req.query.search as string) || "";
        const status = req.query.status as string | undefined;

        const query: Record<string, unknown> = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { registrationNumber: { $regex: search, $options: "i" } },
                { city: { $regex: search, $options: "i" } },
            ];
        }
        if (status) query.status = status;

        const [therapists, total] = await Promise.all([
            Therapist.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select("-__v"),
            Therapist.countDocuments(query),
        ]);

        res.status(200).json({
            therapists,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("getTherapists error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/therapists/:id
// ---------------------------------------------------------------------------
export const getTherapistById = async (req: Request, res: Response): Promise<void> => {
    try {
        const therapist = await Therapist.findById(req.params.id).select("-__v");
        if (!therapist) {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        res.status(200).json({ therapist });
    } catch (error) {
        console.error("getTherapistById error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/therapists/:id
// ---------------------------------------------------------------------------
export const updateTherapist = async (req: Request, res: Response): Promise<void> => {
    try {
        const allowed = [
            "firstName", "lastName", "phoneNumber", "gender", "dateOfBirth",
            "city", "state", "profilePictureUrl",
            "licenseType", "registrationNumber", "registrationCouncil", "registrationExpiryDate",
            "yearsOfExperience", "specializations", "languagesSpoken",
            "highestDegree", "university", "graduationYear",
            "bio", "consultationFee", "sessionDurationMinutes", "offersOnline", "offersInPerson",
            "status",
        ];
        const updates: Record<string, unknown> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        // If admin is activating/verifying
        if (req.body.status === "active" && req.body.verifiedByAdmin === true) {
            updates.verifiedByAdmin = true;
            updates.verifiedAt = new Date();
        }

        const therapist = await Therapist.findByIdAndUpdate(req.params.id, updates, {
            new: true, runValidators: true,
        });

        if (!therapist) {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        res.status(200).json({ message: "Therapist updated", therapist });
    } catch (error) {
        console.error("updateTherapist error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/therapists/:id
// ---------------------------------------------------------------------------
export const deleteTherapist = async (req: Request, res: Response): Promise<void> => {
    try {
        const therapist = await Therapist.findByIdAndDelete(req.params.id);
        if (!therapist) {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        res.status(200).json({ message: "Therapist deleted" });
    } catch (error) {
        console.error("deleteTherapist error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/therapists/:id/resend-credentials
// ---------------------------------------------------------------------------
export const resendCredentials = async (req: Request, res: Response): Promise<void> => {
    try {
        const therapist = await Therapist.findById(req.params.id);
        if (!therapist) {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }

        await sendTherapistWelcomeEmail({
            to: therapist.email,
            firstName: therapist.firstName,
            lastName: therapist.lastName,
            phoneNumber: therapist.phoneNumber,
        });

        res.status(200).json({ message: "Welcome email resent" });
    } catch (error) {
        console.error("resendCredentials error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
