import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { AuthRequest } from "../middleware/auth.middleware";
import { SupportTicket } from "../models/support-ticket.model";
import { User } from "../models/user.model";
import nodemailer from "nodemailer";

const router = Router();

// POST /api/support/contact — submit a support ticket
router.post("/contact", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { email, subject, message, type } = req.body;

        if (!email || !subject || !message) {
            res.status(400).json({ error: "email, subject, and message are required" });
            return;
        }

        // Get user
        const user = await User.findOne({ firebaseUid: req.user!.uid });

        // Save ticket
        const ticket = await SupportTicket.create({
            userId: user?._id,
            email,
            subject,
            message,
            type: type || "client",
        });

        // Send email to support
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            // Email to detangleindia@gmail.com
            await transporter.sendMail({
                from: `"Detangle Support" <${process.env.SMTP_USER}>`,
                to: "detangleindia@gmail.com",
                subject: `New Support Ticket: ${subject}`,
                html: `
                    <h3>New Support Ticket</h3>
                    <p><strong>From:</strong> ${email}</p>
                    <p><strong>User:</strong> ${user ? `${user.firstName} ${user.lastName}` : 'Unknown'}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message}</p>
                    <hr>
                    <p style="color: #888; font-size: 12px;">Ticket ID: ${ticket._id}</p>
                `,
            });

            // Follow-up email to the user
            await transporter.sendMail({
                from: `"Detangle Support" <${process.env.SMTP_USER}>`,
                to: email,
                subject: `We received your message — ${subject}`,
                html: `
                    <h3>Hi there 👋</h3>
                    <p>Thank you for reaching out to Detangle support.</p>
                    <p>We've received your message and will get back to you within 24-48 hours.</p>
                    <p><strong>Your message:</strong></p>
                    <blockquote style="border-left: 3px solid #D19371; padding-left: 12px; color: #555;">${message}</blockquote>
                    <p>If you need immediate support, please call TeleMANAS at <strong>1800-89-14416</strong>.</p>
                    <br>
                    <p>Warm regards,<br>Team Detangle</p>
                `,
            });
        } catch (mailErr) {
            console.error("Support email send error:", mailErr);
            // Don't fail the request if email fails
        }

        res.status(201).json({ message: "Support ticket submitted. We'll get back to you soon!", ticket });
    } catch (error) {
        console.error("submitSupport error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
