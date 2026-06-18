import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

let adminAuth: any;
let adminDb: any;

try {
  if (projectId && clientEmail && privateKey) {
    if (!getApps().length) {
      const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
    }
    adminAuth = getAuth();
    adminDb = getFirestore();
  } else {
    console.warn("Firebase Admin SDK credentials not fully configured in environment. Server-side admin routes will be unavailable.");
  }
} catch (error) {
  console.error("Firebase admin initialization error:", error);
}

export { adminAuth, adminDb };
