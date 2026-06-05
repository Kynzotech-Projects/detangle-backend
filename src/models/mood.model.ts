import mongoose, { Schema, Document } from "mongoose";

export type MoodValue =
    | "very_unpleasant" | "unpleasant" | "slightly_unpleasant"
    | "neutral" | "slightly_pleasant" | "pleasant" | "very_pleasant";

export type MoodInfluence =
    | "work" | "family" | "health" | "relationships" | "sleep" | "other";

export interface IMoodLog extends Document {
    userId: mongoose.Types.ObjectId;
    mood: MoodValue;
    influences: MoodInfluence[];
    loggedDate: string;   // "YYYY-MM-DD" — one per day per user
    createdAt: Date;
    updatedAt: Date;
}

const MoodLogSchema = new Schema<IMoodLog>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        mood: {
            type: String,
            enum: ["very_unpleasant","unpleasant","slightly_unpleasant",
                   "neutral","slightly_pleasant","pleasant","very_pleasant"],
            required: true,
        },
        influences: [{
            type: String,
            enum: ["work","family","health","relationships","sleep","other"],
        }],
        loggedDate: { type: String, required: true }, // "YYYY-MM-DD"
    },
    { timestamps: true }
);

// One log per user per day
MoodLogSchema.index({ userId: 1, loggedDate: 1 }, { unique: true });

export const MoodLog = mongoose.model<IMoodLog>("MoodLog", MoodLogSchema);
