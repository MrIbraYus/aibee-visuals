import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Verifies a Firebase Auth ID token (from Google sign-in in the browser).
 *
 * This does what `firebase-admin/auth`'s verifyIdToken does, using `jose`
 * directly. firebase-admin's auth module loads `jose` through `jwks-rsa`
 * with require(), which crashes on hosts where Node can't require() ES
 * modules (Vercel: "ERR_REQUIRE_ESM"), and that took the whole dashboard down.
 */
const GOOGLE_KEYS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export const firebaseProjectId = () => process.env.FIREBASE_PROJECT_ID?.trim() || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "";

export type FirebaseIdToken = JWTPayload & { email?: string; email_verified?: boolean; auth_time?: number };

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdToken> {
  const projectId = firebaseProjectId();
  if (!projectId) throw new Error("Firebase project ID isn't set.");
  const { payload } = await jwtVerify<FirebaseIdToken>(idToken, GOOGLE_KEYS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
    clockTolerance: 60,
  });
  if (!payload.sub) throw new Error("The sign-in token has no user.");
  if (typeof payload.auth_time === "number" && payload.auth_time * 1000 > Date.now() + 60_000) {
    throw new Error("The sign-in token is from the future.");
  }
  return payload;
}
