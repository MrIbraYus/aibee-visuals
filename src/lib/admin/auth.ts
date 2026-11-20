import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/server/firebase-admin";
import { verifySecret } from "./pin";

/**
 * Admin sessions: a signed, httpOnly cookie issued after either
 *  - Google sign-in (Firebase Auth) with an allow-listed email, or
 *  - the ADMIN_PASSWORD from your environment.
 */
const COOKIE = "aibee_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const adminEmails = () =>
  (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const googleLoginEnabled = () =>
  Boolean(getAdminAuth() && process.env.NEXT_PUBLIC_FIREBASE_API_KEY && adminEmails().length);

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || process.env.FIREBASE_PRIVATE_KEY;
  if (!s) throw new Error("Set ADMIN_SESSION_SECRET (or ADMIN_PASSWORD) to enable the dashboard.");
  return createHash("sha256").update(`aibee-admin:${s}`).digest();
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export type AdminSession = { sub: string; exp: number };

async function issue(sub: string) {
  const payload = Buffer.from(JSON.stringify({ sub, exp: Date.now() + MAX_AGE * 1000 } satisfies AdminSession)).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<AdminSession | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  try {
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSession;
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const s = await getSession();
  if (!s) throw new Error("Your session has expired. Please sign in again.");
  return s;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function loginWithPassword(password: string) {
  if (!(await verifySecret(password))) {
    await wait(600); // slow down guessing
    return false;
  }
  await issue("password");
  return true;
}

export async function loginWithGoogle(idToken: string) {
  const auth = getAdminAuth();
  if (!auth) return { ok: false, error: "Google sign-in isn't configured." };
  try {
    const token = await auth.verifyIdToken(idToken);
    const email = token.email?.toLowerCase();
    if (!email || !token.email_verified || !adminEmails().includes(email)) {
      return { ok: false, error: `${token.email ?? "This account"} doesn't have access to the dashboard.` };
    }
    await issue(email);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't verify your Google sign-in. Try again." };
  }
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}
