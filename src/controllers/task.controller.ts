import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Task } from "../models/task.model";
import { Therapist } from "../models/therapist.model";
import { Appointment } from "../models/appointment.model";
import { User } from "../models/user.model";

// Helper
async function getTherapist(uid: string) {
    const t = await Therapist.findOne({ firebaseUid: uid });
    if (!t) throw new Error("THERAPIST_NOT_FOUND");
    return t;
}

// ---------------------------------------------------------------------------
// POST /api/tasks — therapist assigns tasks to a client after a session
// Body: { appointmentId, tasks: [{ title, description?, type, dueDate? }] }
// ---------------------------------------------------------------------------
export const assignTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await getTherapist(req.user!.uid);
        const { appointmentId, tasks } = req.body;

        if (!appointmentId || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
            res.status(400).json({ error: "appointmentId and tasks array are required" });
            return;
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            res.status(404).json({ error: "Appointment not found" });
            return;
        }

        // Verify this therapist owns the appointment
        if (appointment.therapistId.toString() !== therapist._id.toString()) {
            res.status(403).json({ error: "Not authorized" });
            return;
        }

        const clientId = appointment.userId;

        const createdTasks = await Task.insertMany(
            tasks.map((t: { title: string; description?: string; type?: string; dueDate?: string }) => ({
                therapistId: therapist._id,
                clientId,
                appointmentId,
                title: t.title,
                description: t.description || null,
                type: t.type || "daily",
                dueDate: t.dueDate ? new Date(t.dueDate) : null,
                isDone: false,
            }))
        );

        res.status(201).json({ message: "Tasks assigned successfully", tasks: createdTasks });
    } catch (error: any) {
        if (error.message === "THERAPIST_NOT_FOUND") {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }
        console.error("assignTasks error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/tasks/my — client gets their assigned tasks from current therapist
// Only shows tasks from the therapist linked to the latest subscription
// Query: ?status=pending|done|all (default: pending)
// ---------------------------------------------------------------------------
export const getMyTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        // Find the latest subscription (active or most recent) to get therapist
        const { Subscription } = await import("../models/subscription.model");
        const latestSub = await Subscription.findOne({
            userId: user._id,
        }).sort({ createdAt: -1 }).select("therapistId");

        if (!latestSub || !latestSub.therapistId) {
            res.status(200).json({ tasks: [] });
            return;
        }

        const status = req.query.status as string || "pending";
        const query: Record<string, unknown> = {
            clientId: user._id,
            therapistId: latestSub.therapistId,
        };

        if (status === "pending") query.isDone = false;
        else if (status === "done") query.isDone = true;

        const tasks = await Task.find(query)
            .sort({ createdAt: -1 })
            .select("-__v");

        res.status(200).json({ tasks });
    } catch (error) {
        console.error("getMyTasks error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id/done — client marks a task as done
// ---------------------------------------------------------------------------
export const markTaskDone = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, clientId: user._id },
            { isDone: true },
            { new: true }
        );

        if (!task) {
            res.status(404).json({ error: "Task not found" });
            return;
        }

        res.status(200).json({ message: "Task marked as done", task });
    } catch (error) {
        console.error("markTaskDone error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/tasks/client/:clientId/stats — task progress stats for a client (therapist view)
// ---------------------------------------------------------------------------
export const getClientTaskStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const therapist = await Therapist.findOne({ firebaseUid: req.user!.uid });
        if (!therapist) {
            res.status(404).json({ error: "Therapist not found" });
            return;
        }

        const clientId = req.params.clientId;

        const [total, done] = await Promise.all([
            Task.countDocuments({ therapistId: therapist._id, clientId }),
            Task.countDocuments({ therapistId: therapist._id, clientId, isDone: true }),
        ]);

        const completedPct = total > 0 ? Math.round((done / total) * 100) : 0;
        // Consistency: done tasks vs total that have passed their due date
        const overdue = await Task.countDocuments({
            therapistId: therapist._id,
            clientId,
            isDone: false,
            dueDate: { $lt: new Date() },
        });
        const consistencyPct = total > 0 ? Math.round(((total - overdue) / total) * 100) : 0;

        res.status(200).json({
            total,
            done,
            completedPct,
            consistencyPct,
            missed: overdue,
        });
    } catch (error) {
        console.error("getClientTaskStats error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
