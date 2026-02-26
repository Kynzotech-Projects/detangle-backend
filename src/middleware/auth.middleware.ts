import { Request, Response, NextFunction } from "express";
import { admin } from "../config/firebase";

export interface AuthRequest extends Request {
    user?: admin.auth.DecodedIdToken;
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized — missing or invalid token" });
        return;
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(401).json({ error: "Unauthorized — invalid token" });
    }
};
