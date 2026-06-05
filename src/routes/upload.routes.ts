import { Router } from "express";
import multer from "multer";
import { uploadImage } from "../controllers/upload.controller";

const router = Router();

// Use memory storage — we'll stream directly to Firebase Storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },
});

// POST /api/upload/image — upload an image to Firebase Storage
// Auth not required for admin uploads (protected by ADMIN_SECRET header)
router.post("/image", upload.single("image"), uploadImage);

export default router;
