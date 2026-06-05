import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    therapistId?: mongoose.Types.ObjectId;  // therapist chosen when purchasing
    planId: mongoose.Types.ObjectId;
    planName: string;
    sessionsTotal: number;
    sessionsUsed: number;
    amountPaid: number;
    paymentId: string;
    paymentStatus: "success" | "pending" | "failed";
    status: "active" | "expired" | "cancelled";
    purchasedAt: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        therapistId: { type: Schema.Types.ObjectId, ref: "Therapist", default: null },
        planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        planName: { type: String, required: true },
        sessionsTotal: { type: Number, required: true },
        sessionsUsed: { type: Number, default: 0 },
        amountPaid: { type: Number, required: true },
        paymentId: { type: String, required: true },
        paymentStatus: { type: String, enum: ["success", "pending", "failed"], default: "success" },
        status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
        purchasedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
