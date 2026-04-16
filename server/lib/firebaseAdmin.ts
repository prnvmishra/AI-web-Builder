import 'dotenv/config';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// You must provide GOOGLE_APPLICATION_CREDENTIALS in your environment variables
// OR provide a FIREBASE_SERVICE_ACCOUNT_KEY JSON string.

if (!admin.apps.length) {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // Option 1: Parse stringified JSON from .env
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            if (serviceAccount.private_key) {
                // Ensure escaped \n are converted to actual newlines for the PEM format
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            credential = admin.credential.cert(serviceAccount);
        } catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
        }
    }

    admin.initializeApp({
        credential: credential || admin.credential.applicationDefault()
    });
}

const db = admin.firestore();
const adminAuth = admin.auth();

export { admin, db, adminAuth };
