import mongoose, { Schema, Document } from "mongoose";

export interface ITherapistSurvey extends Document {
    userId: mongoose.Types.ObjectId;
    previousTherapistId?: mongoose.Types.ObjectId;
    newTherapistId: mongoose.Types.ObjectId;
    comfortable?: boolean;
    concernAddressed?: boolean;
    improveReason?: string;
    notes?: string;
    createdAt: Date;
}

const TherapistSurveySchema = new Schema<ITherapistSurvey>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        previousTherapistId: { type: Schema.Types.ObjectId, ref: "Therapist", default: null },
        newTherapistId: { type: Schema.Types.ObjectId, ref: "Therapist", required: true },
        comfortable: { type: Boolean, default: null },
        concernAddressed: { type: Boolean, default: null },
        improveReason: { type: String, default: null },
        notes: { type: String, default: null, maxlength: 1000 },
    },
    { timestamps: true }
);

export const TherapistSurvey = mongoose.model<ITherapistSurvey>("TherapistSurvey", TherapistSurveySchema);
