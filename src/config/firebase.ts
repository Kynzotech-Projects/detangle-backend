import * as admin from "firebase-admin";

export const initializeFirebase = (): void => {
    if (admin.apps.length > 0) {
        return;
    }

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "detangle-india.firebasestorage.app";

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccount)),
            storageBucket,
        });
    } else {
        // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            storageBucket,
        });
    }

    console.log("✅ Firebase Admin initialized");
};

export { admin };
