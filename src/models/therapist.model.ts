import mongoose, { Schema, Document } from "mongoose";

export type TherapistStatus = "active" | "inactive" | "suspended" | "pending_verification";
export type LicenseType =
    | "Clinical Psychologist"
    | "Counselling Psychologist"
    | "Psychiatrist"
    | "Psychotherapist"
    | "LMFT"
    | "Social Worker (MSW)"
    | "Other";

export interface ITherapist extends Document {
    // Auth
    firebaseUid: string;
    email: string;
    mustChangePassword: boolean;

    // Personal info
    firstName: string;
    lastName: string;
    phoneNumber: string;
    gender: "male" | "female" | "non-binary" | "prefer-not-to-say";
    dateOfBirth: Date;
    profilePictureUrl?: string;
    city: string;
    state: string;

    // Professional credentials
    licenseType: LicenseType;
    registrationNumber: string;          // RCI / MCI / State Council number
    registrationCouncil: string;         // e.g. "Rehabilitation Council of India"
    registrationExpiryDate?: Date;
    yearsOfExperience: number;
    specializations: string[];           // e.g. ["Anxiety", "Depression", "Trauma"]
    languagesSpoken: string[];           // e.g. ["English", "Hindi", "Tamil"]

    // Education
    highestDegree: string;               // e.g. "M.Phil Clinical Psychology"
    university: string;
    graduationYear: number;

    // Practice details
    bio: string;
    consultationFee: number;             // per session in INR
    sessionDurationMinutes: number;      // 45 or 60
    offersOnline: boolean;
    offersInPerson: boolean;

    // Platform status
    status: TherapistStatus;
    verifiedByAdmin: boolean;
    verifiedAt?: Date;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const TherapistSchema = new Schema<ITherapist>(
    {
        firebaseUid: { type: String, required: true, unique: true, index: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        mustChangePassword: { type: Boolean, default: true },

        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        phoneNumber: { type: String, required: true, trim: true },
        gender: {
            type: String,
            enum: ["male", "female", "non-binary", "prefer-not-to-say"],
            required: true,
        },
        dateOfBirth: { type: Date, required: true },
        profilePictureUrl: { type: String, default: null },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },

        licenseType: {
            type: String,
            enum: [
                "Clinical Psychologist",
                "Counselling Psychologist",
                "Psychiatrist",
                "Psychotherapist",
                "LMFT",
                "Social Worker (MSW)",
                "Other",
            ],
            required: true,
        },
        registrationNumber: { type: String, required: true, trim: true },
        registrationCouncil: { type: String, required: true, trim: true },
        registrationExpiryDate: { type: Date, default: null },
        yearsOfExperience: { type: Number, required: true, min: 0 },
        specializations: { type: [String], required: true },
        languagesSpoken: { type: [String], required: true },

        highestDegree: { type: String, required: true, trim: true },
        university: { type: String, required: true, trim: true },
        graduationYear: { type: Number, required: true },

        bio: { type: String, required: true, trim: true, maxlength: 1000 },
        consultationFee: { type: Number, required: true, min: 0 },
        sessionDurationMinutes: { type: Number, enum: [30, 45, 60, 90], default: 60 },
        offersOnline: { type: Boolean, default: true },
        offersInPerson: { type: Boolean, default: false },

        status: {
            type: String,
            enum: ["active", "inactive", "suspended", "pending_verification"],
            default: "pending_verification",
        },
        verifiedByAdmin: { type: Boolean, default: false },
        verifiedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export const Therapist = mongoose.model<ITherapist>("Therapist", TherapistSchema);
