import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import * as webpush from "web-push";
import { DATA_DIR, storageMode } from "@/lib/content/store";
import { getAdminDb } from "./firebase-admin";

/**
 * Web Push notifications for the studio dashboard: "New message from …" on
 * your phone or computer, even when /admin isn't open.
 *
 * Keys (VAPID) are created automatically on first use and kept in Firebase
 * (`site/push`), so there's nothing to configure. Devices opt in from the
 * dashboard's Messages page.
 */

export type PushSubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };
type Keys = { publicKey: string; privateKey: string };
type LocalFile = { keys?: Keys; subscriptions: (PushSubscriptionJSON & { device?: string })[] };

const LOCAL_FILE = path.join(/*turbopackIgnore: true*/ DATA_DIR, "push.json");
const SUBSCRIPTIONS = "pushSubscriptions";
let cachedKeys: Keys | null = null;

const idOf = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex").slice(0, 40);

async function readLocal(): Promise<LocalFile> {
  try {
    return JSON.parse(await readFile(LOCAL_FILE, "utf8")) as LocalFile;
  } catch {
    return { subscriptions: [] };
  }
}
async function writeLocal(data: LocalFile) {
  await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await writeFile(LOCAL_FILE, JSON.stringify(data, null, 2), "utf8");
}

export const pushAvailable = () => storageMode() !== "readonly";

async function vapidKeys(): Promise<Keys | null> {
  if (cachedKeys) return cachedKeys;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) return (cachedKeys = { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY });

  const mode = storageMode();
  if (mode === "firestore") {
    const db = getAdminDb()!;
    const ref = db.doc("site/push");
    cachedKeys = await db.runTransaction(async (tx) => {
      const data = (await tx.get(ref)).data();
      if (data?.publicKey && data?.privateKey) return { publicKey: String(data.publicKey), privateKey: String(data.privateKey) };
      const fresh = webpush.generateVAPIDKeys();
      tx.set(ref, { ...fresh, createdAt: Date.now() }, { merge: true });
      return fresh;
    });
    return cachedKeys;
  }
  if (mode === "local") {
    const file = await readLocal();
    if (!file.keys) {
      file.keys = webpush.generateVAPIDKeys();
      await writeLocal(file);
    }
    return (cachedKeys = file.keys);
  }
  return null;
}

export async function pushPublicKey(): Promise<string | null> {
  return (await vapidKeys())?.publicKey ?? null;
}

export async function savePushSubscription(sub: PushSubscriptionJSON, device?: string) {
  const record = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, device: device?.slice(0, 120) ?? "", createdAt: Date.now() };
  const mode = storageMode();
  if (mode === "firestore") {
    await getAdminDb()!.collection(SUBSCRIPTIONS).doc(idOf(sub.endpoint)).set(record);
  } else if (mode === "local") {
    const file = await readLocal();
    file.subscriptions = [...file.subscriptions.filter((s) => s.endpoint !== sub.endpoint), record];
    await writeLocal(file);
  }
}

export async function removePushSubscription(endpoint: string) {
  const mode = storageMode();
  if (mode === "firestore") {
    await getAdminDb()!.collection(SUBSCRIPTIONS).doc(idOf(endpoint)).delete();
  } else if (mode === "local") {
    const file = await readLocal();
    file.subscriptions = file.subscriptions.filter((s) => s.endpoint !== endpoint);
    await writeLocal(file);
  }
}

async function listSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const mode = storageMode();
  if (mode === "firestore") {
    const snap = await getAdminDb()!.collection(SUBSCRIPTIONS).limit(50).get();
    return snap.docs.map((d) => d.data() as PushSubscriptionJSON);
  }
  if (mode === "local") return (await readLocal()).subscriptions;
  return [];
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Sends a notification to every device that turned notifications on. Returns how many got it. */
export async function sendPush(payload: PushPayload): Promise<number> {
  if (!pushAvailable()) return 0;
  const [keys, subs] = await Promise.all([vapidKeys(), listSubscriptions()]);
  if (!keys || !subs.length) return 0;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  const options = {
    TTL: 60 * 60 * 24,
    urgency: "high" as const,
    vapidDetails: {
      subject: site.startsWith("https://") ? site : "https://aibeevisuals.com",
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    },
  };
  const body = JSON.stringify({ url: "/admin#messages", tag: "message", ...payload });
  let delivered = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body, options);
        delivered += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // The device unsubscribed or the subscription expired.
        if (status === 404 || status === 410) await removePushSubscription(sub.endpoint).catch(() => {});
        else console.error("[push] send failed", status ?? err);
      }
    }),
  );
  return delivered;
}
