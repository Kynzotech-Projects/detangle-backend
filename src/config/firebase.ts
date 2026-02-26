import * as admin from "firebase-admin";

export const initializeFirebase = (): void => {
    if (admin.apps.length > 0) {
        return;
    }

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccount)),
        });
    } else {
        // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    }

    console.log("✅ Firebase Admin initialized");
};

export { admin };
