import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null | undefined;
let initError: string | null = null;

export const firebaseAdminConfigured = () =>
  Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

/** Why the Firebase Admin keys couldn't be used (null when fine or not set). */
export const firebaseAdminError = () => {
  getAdminApp();
  return initError;
};

/**
 * Firebase Admin app (server only). Returns null when the service account
 * isn't configured — or is malformed, in which case the reason is kept in
 * `firebaseAdminError()` instead of crashing every page.
 */
export function getAdminApp(): App | null {
  if (app !== undefined) return app;
  if (!firebaseAdminConfigured()) {
    app = null;
    return app;
  }
  try {
    app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID!.trim(),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!.trim(),
          // Accept the key pasted with or without surrounding quotes, with real or escaped newlines.
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
        }),
      });
  } catch (err) {
    initError = `Firebase keys are set but couldn't be used: ${err instanceof Error ? err.message : String(err)}`;
    console.error("[firebase-admin]", initError);
    app = null;
  }
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
