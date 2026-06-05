import { Request, Response } from "express";
import { getStorage } from "firebase-admin/storage";

/**
 * POST /api/upload/image
 * Uploads an image to Firebase Storage and returns the public download URL.
 * Accepts multipart/form-data with field name "image".
 * Optional query param: ?folder=profile_pictures (defaults to "uploads")
 */
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: "No image file provided" });
            return;
        }

        const folder = (req.query.folder as string) || "uploads";
        const ext = file.originalname.split(".").pop() || "jpg";
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const bucket = getStorage().bucket();
        const blob = bucket.file(fileName);

        const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        await blob.save(file.buffer, {
            metadata: {
                contentType: file.mimetype,
                metadata: {
                    firebaseStorageDownloadTokens: token,
                },
            },
        });

        // Make the file publicly readable
        await blob.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        res.status(200).json({
            url: publicUrl,
            fileName,
        });
    } catch (error) {
        console.error("uploadImage error:", error);
        res.status(500).json({ error: "Failed to upload image" });
    }
};
