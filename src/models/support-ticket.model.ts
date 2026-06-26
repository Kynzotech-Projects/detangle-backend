import mongoose, { Schema, Document } from "mongoose";

export interface ISupportTicket extends Document {
    userId?: mongoose.Types.ObjectId;
    email: string;
    subject: string;
    message: string;
    type: "client" | "therapist";
    status: "open" | "resolved";
    createdAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
        email: { type: String, required: true },
        subject: { type: String, required: true, maxlength: 200 },
        message: { type: String, required: true, maxlength: 2000 },
        type: { type: String, enum: ["client", "therapist"], default: "client" },
        status: { type: String, enum: ["open", "resolved"], default: "open" },
    },
    { timestamps: true }
);

export const SupportTicket = mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
