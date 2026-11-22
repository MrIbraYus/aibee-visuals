import { NextResponse } from "next/server";
import { firebaseAdminConfigured, firebaseAdminError, getAdminDb } from "@/lib/server/firebase-admin";

/**
 * GET /api/admin/health — plain setup diagnostics for the dashboard's error
 * screen. A normal request rather than a Server Action, so it still answers
 * when Server Actions themselves are failing. Reports yes/no checks and
 * error messages only, never key values.
 */
export async function GET(request: Request) {
  const checks: { name: string; ok: boolean; detail?: string }[] = [];
  const env = process.env;
  const add = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, ...(detail ? { detail } : {}) });
  const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).split("\n")[0].slice(0, 240);

  add("Firebase keys set", firebaseAdminConfigured(), firebaseAdminConfigured() ? undefined : "Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel");
  try {
    const keyError = firebaseAdminError();
    add("Firebase keys valid", !keyError, keyError ?? undefined);
  } catch (err) {
    add("Firebase keys valid", false, message(err));
  }
  try {
    const db = getAdminDb();
    if (!db) add("Database reachable", false, firebaseAdminError() ?? "Firebase isn't connected");
    else {
      await db.doc("site/meta").get();
      add("Database reachable", true);
    }
  } catch (err) {
    add("Database reachable", false, message(err));
  }
  const cloudinary = Boolean((env.CLOUDINARY_CLOUD_NAME ?? env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  add("Cloudinary keys set", cloudinary, cloudinary ? undefined : "Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Vercel");
  const sessionKey = Boolean(env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || env.FIREBASE_PRIVATE_KEY);
  add("Session secret set", sessionKey, sessionKey ? undefined : "Add ADMIN_SESSION_SECRET in Vercel");

  // Server Actions refuse requests whose Origin doesn't match the host they arrive on.
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
  const origin = headers.get("origin");
  const referer = headers.get("referer");
  let pageHost = "";
  try {
    pageHost = new URL(origin ?? referer ?? "").host;
  } catch {}
  if (pageHost) add("Page and server address match", pageHost === host, pageHost === host ? undefined : `Page is on ${pageHost} but requests arrive as ${host}`);

  return NextResponse.json({ ok: checks.every((c) => c.ok), checks }, { headers: { "Cache-Control": "no-store" } });
}
