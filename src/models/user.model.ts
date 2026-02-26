import mongoose, { Schema, Document } from "mongoose";

export interface ILocation {
    latitude: number;
    longitude: number;
    city?: string;
}

export interface IUser extends Document {
    // Firebase fields
    firebaseUid: string;
    firebaseProvider?: string;
    emailVerified?: boolean;

    // Personal info
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    password?: string;
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

const LocationSchema: Schema = new Schema(
    {
        latitude: {
            type: Number,
            required: true,
        },
        longitude: {
            type: Number,
            required: true,
        },
        city: {
            type: String,
            default: null,
        },
    },
    { _id: false }
);

const UserSchema: Schema = new Schema(
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
            default: null,
        },
        emailVerified: {
            type: Boolean,
            default: false,
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
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phoneNumber: {
            type: String,
            default: null,
            trim: true,
        },
        password: {
            type: String,
            default: null,
            select: false, // Excluded from queries by default
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
