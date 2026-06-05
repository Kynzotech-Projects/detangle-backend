import mongoose, { Schema, Document } from "mongoose";

export interface ILocation {
    latitude: number;
    longitude: number;
    city?: string;
}

export type RegistrationStatus = "pending_otp" | "complete";
export type AuthProvider = "phone" | "google.com" | "apple.com" | "password";

export interface IUser extends Document {
    // Firebase fields
    firebaseUid: string;
    firebaseProvider: AuthProvider;
    emailVerified: boolean;
    phoneVerified: boolean;

    // Registration state
    registrationStatus: RegistrationStatus;

    // Personal info
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: Date;
    gender?: "male" | "female" | "non-binary" | "prefer-not-to-say";
    profilePictureUrl?: string;

    // Location
    location?: ILocation;

    // Legal
    isTermsAccepted: boolean;
    termsAcceptedAt?: Date;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
    {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        city: { type: String, default: null },
    },
    { _id: false }
);

const UserSchema = new Schema<IUser>(
    {
        // Firebase fields
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        firebaseProvider: {
            type: String,
            enum: ["phone", "google.com", "apple.com", "password"],
            required: true,
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        phoneVerified: {
            type: Boolean,
            default: false,
        },

        // Registration state
        registrationStatus: {
            type: String,
            enum: ["pending_otp", "complete"],
            default: "pending_otp",
        },

        // Personal info
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            default: null,
            lowercase: true,
            trim: true,
            sparse: true, // allows multiple null values with unique index
        },
        phoneNumber: {
            type: String,
            default: null,
            trim: true,
            sparse: true,
        },
        dateOfBirth: {
            type: Date,
            default: null,
        },
        gender: {
            type: String,
            enum: ["male", "female", "non-binary", "prefer-not-to-say"],
            default: null,
        },
        profilePictureUrl: {
            type: String,
            default: null,
        },

        // Location
        location: {
            type: LocationSchema,
            default: null,
        },

        // Legal
        isTermsAccepted: {
            type: Boolean,
            required: true,
            default: false,
        },
        termsAcceptedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model<IUser>("User", UserSchema);
