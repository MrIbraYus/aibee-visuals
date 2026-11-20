"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

/** Browser Firebase app (Auth + Firestore reads for the studio dashboard). */
export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  return getApps().length ? getApp() : initializeApp(config);
}

export const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
