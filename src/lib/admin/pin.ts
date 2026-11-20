import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getAdminDb } from "@/lib/server/firebase-admin";

/**
 * The dashboard PIN/password, stored as a salted scrypt hash in Firestore
 * (`site/admin`) so the live site can check it without any extra settings.
 * ADMIN_PASSWORD in the environment still works and takes priority.
 */
const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const DOC = "site/admin";

export async function hashSecret(secret: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(secret, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function matchesHash(secret: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scryptAsync(secret, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(expected, actual);
}

type StoredSecret = { hash: string; length: number; numeric: boolean };

async function storedSecret(): Promise<StoredSecret | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const snap = await db.doc(DOC).get();
    const data = snap.data();
    if (!data?.pinHash) return null;
    return { hash: data.pinHash, length: data.pinLength ?? 0, numeric: !!data.pinNumeric };
  } catch {
    return null;
  }
}

export async function saveSecret(secret: string) {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase isn't connected.");
  await db.doc(DOC).set(
    { pinHash: await hashSecret(secret), pinLength: secret.length, pinNumeric: /^\d+$/.test(secret), updatedAt: Date.now() },
    { merge: true },
  );
}

/** Is any password/PIN configured? Also tells the login screen to show a PIN pad. */
export async function secretInfo(): Promise<{ enabled: boolean; pinLength?: number }> {
  const env = process.env.ADMIN_PASSWORD;
  if (env) return { enabled: true, pinLength: /^\d{4,8}$/.test(env) ? env.length : undefined };
  const stored = await storedSecret();
  if (!stored) return { enabled: false };
  return { enabled: true, pinLength: stored.numeric && stored.length >= 4 && stored.length <= 8 ? stored.length : undefined };
}

export async function verifySecret(secret: string) {
  const env = process.env.ADMIN_PASSWORD;
  if (env) {
    const a = createHash("sha256").update(secret).digest();
    const b = createHash("sha256").update(env).digest();
    return timingSafeEqual(a, b);
  }
  const stored = await storedSecret();
  return stored ? matchesHash(secret, stored.hash) : false;
}

/* ------------------------------------------------------------------ */
/*  Brute-force protection: 5 wrong tries per device → 15 min lockout  */
/* ------------------------------------------------------------------ */

const MAX_TRIES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const memory = new Map<string, { count: number; first: number }>();

const keyFor = (ip: string) => createHash("sha256").update(`aibee-login:${ip}`).digest("hex").slice(0, 32);

async function readAttempts(ip: string) {
  const key = keyFor(ip);
  const db = getAdminDb();
  if (!db) return memory.get(key) ?? null;
  const snap = await db.collection("loginAttempts").doc(key).get();
  return (snap.data() as { count: number; first: number } | undefined) ?? null;
}

async function writeAttempts(ip: string, value: { count: number; first: number } | null) {
  const key = keyFor(ip);
  const db = getAdminDb();
  if (!db) {
    if (value) memory.set(key, value);
    else memory.delete(key);
    return;
  }
  const ref = db.collection("loginAttempts").doc(key);
  if (value) await ref.set(value);
  else await ref.delete();
}

/** Minutes left on a lockout, or 0 when this device may try again. */
export async function lockoutMinutes(ip: string) {
  const a = await readAttempts(ip);
  if (!a || Date.now() - a.first > WINDOW_MS || a.count < MAX_TRIES) return 0;
  return Math.max(1, Math.ceil((a.first + WINDOW_MS - Date.now()) / 60000));
}

export async function recordAttempt(ip: string, success: boolean) {
  if (success) return writeAttempts(ip, null);
  const a = await readAttempts(ip);
  const fresh = !a || Date.now() - a.first > WINDOW_MS;
  await writeAttempts(ip, fresh ? { count: 1, first: Date.now() } : { count: a.count + 1, first: a.first });
}
