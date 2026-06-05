/**
 * Run once to seed initial plans:
 *   npx ts-node src/scripts/seed-plans.ts
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Plan } from "../models/plan.model";

const plans = [
    {
        name: "Single Session",
        subtitle: "One session",
        sessions: 1,
        priceInr: 1499,
        validityDays: 30,
        sessionDurationMinutes: 50,
        features: [
            "1 therapy session",
            "Audio, Video call and Message",
            "50 minutes duration",
        ],
        sortOrder: 1,
        isActive: true,
    },
    {
        name: "5 Sessions Plan",
        subtitle: "Valid for 2 months",
        sessions: 5,
        priceInr: 5999,
        validityDays: 60,
        sessionDurationMinutes: 50,
        features: [
            "5 therapy sessions",
            "Audio, Video call and Message",
            "50 min each",
            "Flexible scheduling",
        ],
        sortOrder: 2,
        isActive: true,
    },
    {
        name: "10 Sessions Plan",
        subtitle: "Valid for 4 months",
        sessions: 10,
        priceInr: 9999,
        validityDays: 120,
        sessionDurationMinutes: 50,
        features: [
            "10 therapy sessions",
            "Audio, Video call and Message",
            "50 min each",
            "Flexible scheduling",
            "Priority booking",
        ],
        sortOrder: 3,
        isActive: true,
    },
];

async function seed() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not set");
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Remove existing plans
    await Plan.deleteMany({});
    console.log("Cleared existing plans");

    // Insert
    await Plan.insertMany(plans);
    console.log(`Seeded ${plans.length} plans`);

    await mongoose.disconnect();
    console.log("Done!");
    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
