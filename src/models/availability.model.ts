import mongoose, { Schema, Document } from "mongoose";

export type DayOfWeek =
    | "Monday" | "Tuesday" | "Wednesday" | "Thursday"
    | "Friday" | "Saturday" | "Sunday";

export interface ITimeSlot {
    startTime: string;  // "HH:mm" 24h format, e.g. "09:00"
    endTime: string;    // "HH:mm" 24h format, e.g. "11:00"
}

export interface IAvailability extends Document {
    therapistId: mongoose.Types.ObjectId;
    date?: Date;
    dayOfWeek: DayOfWeek;
    slots: ITimeSlot[];
    isRecurring: boolean;
    isBlocked: boolean;      // true = therapist blocked this specific date
    createdAt: Date;
    updatedAt: Date;
}

const TimeSlotSchema = new Schema<ITimeSlot>(
    {
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
    },
    { _id: false }
);

const AvailabilitySchema = new Schema<IAvailability>(
    {
        therapistId: { type: Schema.Types.ObjectId, ref: "Therapist", required: true, index: true },
        date: { type: Date, default: null },
        dayOfWeek: {
            type: String,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            required: true,
        },
        slots: { type: [TimeSlotSchema], default: [] },
        isRecurring: { type: Boolean, default: false },
        isBlocked: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Unique index: one availability record per therapist per date+day combination
AvailabilitySchema.index({ therapistId: 1, dayOfWeek: 1, date: 1 }, { unique: true, sparse: true });

export const Availability = mongoose.model<IAvailability>("Availability", AvailabilitySchema);
