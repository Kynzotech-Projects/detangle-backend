import { Request, Response, NextFunction } from "express";

/**
 * Simple admin auth middleware.
 * Expects: Authorization: Bearer <ADMIN_SECRET>
 * Set ADMIN_SECRET in your .env file.
 */
export const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const token = authHeader.split("Bearer ")[1];
    const secret = process.env.ADMIN_SECRET;

    if (!secret) {
        console.error("ADMIN_SECRET is not set in environment");
        res.status(500).json({ error: "Admin auth not configured" });
        return;
    }

    if (token !== secret) {
        res.status(403).json({ error: "Forbidden — invalid admin token" });
        return;
    }

    next();
};
