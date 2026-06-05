import mongoose, { Schema, Document } from "mongoose";

export interface IPlan extends Document {
    name: string;                    // e.g. "Single Session", "5 Sessions Plan"
    subtitle: string;                // e.g. "One session", "Valid for 2 months"
    sessions: number;                // number of therapy sessions included
    priceInr: number;                // price in INR
    validityDays: number;            // how many days the plan is valid
    sessionDurationMinutes: number;  // e.g. 50
    features: string[];              // e.g. ["Audio, Video call and Message", "Flexible scheduling"]
    isActive: boolean;               // can be deactivated by admin
    sortOrder: number;               // display order
    createdAt: Date;
    updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
    {
        name: { type: String, required: true, trim: true },
        subtitle: { type: String, required: true, trim: true },
        sessions: { type: Number, required: true, min: 1 },
        priceInr: { type: Number, required: true, min: 0 },
        validityDays: { type: Number, required: true, min: 1 },
        sessionDurationMinutes: { type: Number, required: true, default: 50 },
        features: { type: [String], required: true },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const Plan = mongoose.model<IPlan>("Plan", PlanSchema);
