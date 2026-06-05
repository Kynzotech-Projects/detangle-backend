import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
    userId: mongoose.Types.ObjectId;
    therapistId: mongoose.Types.ObjectId;
    appointmentId: mongoose.Types.ObjectId;
    rating: number;        // 1-5
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        therapistId: { type: Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
        appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, unique: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: null, maxlength: 500 },
    },
    { timestamps: true }
);

export const Review = mongoose.model<IReview>("Review", ReviewSchema);
