import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null | undefined;

export const firebaseAdminConfigured = () =>
  Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

/** Firebase Admin app (server only); null when the service account isn't configured. */
export function getAdminApp(): App | null {
  if (app !== undefined) return app;
  if (!firebaseAdminConfigured()) {
    app = null;
    return app;
  }
  app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  return app;
}

export function getAdminDb(): Firestore | null {
  const a = getAdminApp();
  return a ? getFirestore(a) : null;
}

export function getAdminAuth(): Auth | null {
  const a = getAdminApp();
  return a ? getAuth(a) : null;
}
