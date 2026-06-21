import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
    therapistId: mongoose.Types.ObjectId;
    clientId: mongoose.Types.ObjectId;
    appointmentId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    type: "daily" | "weekly" | "once";
    dueDate?: Date;
    isDone: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
    {
        therapistId: { type: Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
        clientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, default: null, maxlength: 500 },
        type: { type: String, enum: ["daily", "weekly", "once"], default: "daily" },
        dueDate: { type: Date, default: null },
        isDone: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const Task = mongoose.model<ITask>("Task", TaskSchema);
