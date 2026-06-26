import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { initializeFirebase } from "./config/firebase";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import planRoutes from "./routes/plan.routes";
import therapistRoutes from "./routes/therapist.routes";
import publicRoutes from "./routes/public.routes";
import appointmentRoutes from "./routes/appointment.routes";
import zegoRoutes from "./routes/zego.routes";
import moodRoutes from "./routes/mood.routes";
import uploadRoutes from "./routes/upload.routes";
import taskRoutes from "./routes/task.routes";
import supportRoutes from "./routes/support.routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase
initializeFirebase();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/therapist", therapistRoutes);
app.use("/api", publicRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/zego", zegoRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/support", supportRoutes);

// Health check
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
            console.log(`📱 On-device access: http://<your-LAN-IP>:${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
