import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { User } from "../models/user.model";
import { Therapist } from "../models/therapist.model";
import { Appointment } from "../models/appointment.model";
import { generateZegoToken, ZEGO_APP_ID } from "../services/zego.service";

// ---------------------------------------------------------------------------
// POST /api/zego/token
// Returns a Zego auth token for the current user (client or therapist)
// Body: { appointmentId }
// ---------------------------------------------------------------------------
export const getZegoToken = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { uid } = req.user!;
        const { appointmentId } = req.body;

        if (!appointmentId) {
            res.status(400).json({ error: "appointmentId is required" });
            return;
        }

        // Verify the user is a participant in this appointment
        const appointment = await Appointment.findById(appointmentId)
            .populate("userId", "firebaseUid")
            .populate("therapistId", "firebaseUid");

        if (!appointment) {
            res.status(404).json({ error: "Appointment not found" });
            return;
        }

        const clientUid = (appointment.userId as any)?.firebaseUid;
        const therapistUid = (appointment.therapistId as any)?.firebaseUid;

        if (uid !== clientUid && uid !== therapistUid) {
            res.status(403).json({ error: "You are not a participant in this appointment" });
            return;
        }

        // Determine the other participant's UID
        const otherUserId = uid === clientUid ? therapistUid : clientUid;

        // Use appointmentId as the room ID — same for both sides
        const roomId = appointmentId.toString();
        const token = generateZegoToken(uid, roomId);

        res.status(200).json({
            token,
            appId: ZEGO_APP_ID,
            roomId,
            userId: uid,
            otherUserId: otherUserId || "",
        });
    } catch (error) {
        console.error("getZegoToken error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
