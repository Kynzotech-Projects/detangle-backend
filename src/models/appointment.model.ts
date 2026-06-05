import mongoose, { Schema, Document } from "mongoose";

export type SessionType = "video" | "audio" | "message";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface IAppointment extends Document {
    userId: mongoose.Types.ObjectId;
    therapistId: mongoose.Types.ObjectId;
    subscriptionId: mongoose.Types.ObjectId;
    sessionType: SessionType;
    date: Date;               // scheduled date (UTC, date-only, no time)
    startTime: string;        // "HH:mm" 24h
    endTime: string;          // "HH:mm" 24h (startTime + sessionDuration)
    status: AppointmentStatus;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        therapistId: { type: Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
        subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
        sessionType: { type: String, enum: ["video", "audio", "message"], required: true },
        date: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "confirmed" },
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Prevent double-booking: one appointment per therapist per date+time slot
AppointmentSchema.index({ therapistId: 1, date: 1, startTime: 1 }, { unique: true });

export const Appointment = mongoose.model<IAppointment>("Appointment", AppointmentSchema);
