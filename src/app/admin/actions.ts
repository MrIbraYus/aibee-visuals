"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import {
  getSession,
  googleLoginEnabled,
  loginWithGoogle,
  loginWithPassword,
  logout as clearSession,
  requireAdmin,
} from "@/lib/admin/auth";
import { lockoutMinutes, recordAttempt, saveSecret, secretInfo, verifySecret } from "@/lib/admin/pin";
import { CONTENT_TAG } from "@/lib/content/queries";
import {
  deleteInquiry,
  listInquiries,
  readContent,
  removeProject,
  setBrands,
  setTestimonials,
  setWebsites,
  storageMode,
  unreadInquiries,
  updateInquiry,
  upsertProjects,
  type StorageMode,
  type UnreadSummary,
} from "@/lib/content/store";
import {
  brandSchema,
  projectSchema,
  testimonialSchema,
  websiteSchema,
  type Brand,
  type Inquiry,
  type Media,
  type Project,
  type SiteContent,
  type Testimonial,
  type Website,
} from "@/lib/content/types";
import { pushAvailable, pushPublicKey, removePushSubscription, savePushSubscription, sendPush } from "@/lib/server/push";
import { deleteMedia, mediaMode, uploadTarget, type MediaMode, type UploadTarget } from "@/lib/media/server";
import { firebaseAdminConfigured, firebaseAdminError } from "@/lib/server/firebase-admin";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const fail = (err: unknown): { ok: false; error: string } => ({
  ok: false,
  error: err instanceof z.ZodError ? (err.issues[0]?.message ?? "Invalid data.") : err instanceof Error ? err.message : "Something went wrong.",
});

const refresh = () => updateTag(CONTENT_TAG);

export type AdminState = {
  authed: boolean;
  user?: string;
  storage: StorageMode;
  media: MediaMode;
  login: { google: boolean; password: boolean; pinLength?: number };
  content?: SiteContent;
  /** Setup problems worth showing on the sign-in screen (missing/broken keys…). */
  problems: string[];
  /** Unread website messages (signed in only). */
  unread?: number;
};

/* ------------------------------------------------------------------ */
/*  Session                                                             */
/* ------------------------------------------------------------------ */

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err)).split("\n")[0].slice(0, 300);

/** Runs one setup step; a failure becomes a readable problem instead of crashing the dashboard. */
async function step<T>(label: string, fallback: T, run: () => T | Promise<T>, problems: string[]): Promise<T> {
  try {
    return await run();
  } catch (err) {
    console.error(`[admin] ${label} failed`, err);
    problems.push(`${label}: ${messageOf(err)}`);
    return fallback;
  }
}

/**
 * Everything the dashboard needs to start. It never throws: in production a
 * thrown error reaches the browser as an unreadable "React error #441", so each
 * failure is reported by name on the sign-in screen instead.
 */
export async function getAdminState(): Promise<AdminState> {
  const problems: string[] = [];
  try {
    const keyError = await step("Firebase keys", null, () => firebaseAdminError(), problems);
    if (keyError) problems.push(keyError);
    else if (process.env.VERCEL && !firebaseAdminConfigured()) {
      problems.push("FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY aren't set in this deployment's environment variables.");
    }

    const storage = await step<StorageMode>("Database", "readonly", () => storageMode(), problems);
    const media = await step<MediaMode>("Media storage", "none", () => mediaMode(), problems);
    const secret = await step("Reading the dashboard PIN", { enabled: false } as { enabled: boolean; pinLength?: number }, () => secretInfo(), problems);
    if (!secret.enabled && !keyError && firebaseAdminConfigured() && storage === "firestore") {
      problems.push("No dashboard PIN is saved in Firebase yet. Run: npm run admin:pin -- 1234");
    }
    const google = await step("Google sign-in", false, () => googleLoginEnabled(), problems);
    const session = await step("Reading your session", null, () => getSession(), problems);

    const base = { storage, media, login: { google, password: secret.enabled, pinLength: secret.pinLength }, problems };
    if (!session) return { authed: false, ...base };

    const content = await step("Loading your content", null, () => readContent(), problems);
    if (!content) return { authed: false, ...base };
    const unread = await step("Counting messages", { count: 0 }, () => unreadInquiries(), []);
    // Plain JSON only, so nothing unusual stored in the database can break the response.
    return { authed: true, user: session.sub, ...base, content: JSON.parse(JSON.stringify(content)) as SiteContent, unread: unread.count };
  } catch (err) {
    console.error("[admin] getAdminState failed", err);
    return {
      authed: false,
      storage: "readonly",
      media: "none",
      login: { google: false, password: false },
      problems: [...problems, `The dashboard server hit an error: ${messageOf(err)}`],
    };
  }
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function signInWithPassword(password: string): Promise<Result> {
  try {
    if (!(await secretInfo()).enabled) return { ok: false, error: "No dashboard PIN is set up yet." };
    const ip = await clientIp();
    const locked = await lockoutMinutes(ip).catch(() => 0);
    if (locked) return { ok: false, error: `Too many wrong tries. Try again in ${locked} minute${locked > 1 ? "s" : ""}.` };
    const ok = await loginWithPassword(String(password).slice(0, 200));
    await recordAttempt(ip, ok).catch(() => {});
    return ok ? { ok: true, data: undefined } : { ok: false, error: "That PIN isn't right." };
  } catch (err) {
    console.error("[admin] sign-in failed", err);
    return fail(err);
  }
}

/** Changes the dashboard PIN (stored hashed in Firebase). */
export async function changePin(current: string, next: string): Promise<Result> {
  try {
    await requireAdmin();
    if (!(await verifySecret(String(current)))) throw new Error("Your current PIN isn't right.");
    const value = String(next).trim();
    if (value.length < 4 || value.length > 64) throw new Error("Use 4 to 64 characters.");
    await saveSecret(value);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function signInWithGoogle(idToken: string): Promise<Result> {
  try {
    const res = await loginWithGoogle(String(idToken));
    return res.ok ? { ok: true, data: undefined } : { ok: false, error: res.error ?? "Sign-in failed." };
  } catch (err) {
    console.error("[admin] Google sign-in failed", err);
    return fail(err);
  }
}

export async function signOut(): Promise<Result> {
  try {
    await clearSession();
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

/* ------------------------------------------------------------------ */
/*  Projects & assets                                                   */
/* ------------------------------------------------------------------ */

export async function saveProject(input: Project): Promise<Result<Project>> {
  try {
    await requireAdmin();
    const project = projectSchema.parse({ ...input, updatedAt: Date.now() });
    const { projects } = await readContent();
    const clash = projects.find((p) => p.slug === project.slug && p.id !== project.id);
    if (clash) throw new Error(`The link "/work/${project.slug}" is already used by ${clash.client}.`);

    // Files removed from the project are deleted from storage too.
    const before = projects.find((p) => p.id === project.id);
    if (before) {
      const keep = new Set(project.assets.map((a) => a.media.url));
      await Promise.all(before.assets.filter((a) => !keep.has(a.media.url)).map((a) => deleteMedia(a.media)));
    }

    await upsertProjects([project]);
    refresh();
    return { ok: true, data: project };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProject(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const { projects } = await readContent();
    const project = projects.find((p) => p.id === id);
    if (!project) throw new Error("That project no longer exists.");
    await removeProject(id);
    await Promise.all(project.assets.map((a) => deleteMedia(a.media)));
    refresh();
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

/** Saves several projects at once (project order, hero picks, reel picks). */
export async function saveProjects(input: Project[]): Promise<Result> {
  try {
    await requireAdmin();
    const projects = z.array(projectSchema).max(500).parse(input);
    await upsertProjects(projects);
    refresh();
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

/* ------------------------------------------------------------------ */
/*  Brands                                                              */
/* ------------------------------------------------------------------ */

export async function saveBrands(input: Brand[]): Promise<Result<Brand[]>> {
  try {
    await requireAdmin();
    const brands = z.array(brandSchema).max(200).parse(input);
    const { brands: before } = await readContent();
    const keep = new Set(brands.map((b) => b.logo?.url).filter(Boolean));
    await Promise.all(before.filter((b) => b.logo && !keep.has(b.logo.url)).map((b) => deleteMedia(b.logo)));
    await setBrands(brands);
    refresh();
    return { ok: true, data: brands };
  } catch (err) {
    return fail(err);
  }
}

/* ------------------------------------------------------------------ */
/*  Websites & testimonials                                             */
/* ------------------------------------------------------------------ */

export async function saveWebsites(input: Website[]): Promise<Result<Website[]>> {
  try {
    await requireAdmin();
    const websites = z.array(websiteSchema).max(100).parse(input);
    const { websites: before } = await readContent();
    const keep = new Set(websites.map((w) => w.image?.url).filter(Boolean));
    await Promise.all(before.filter((w) => w.image && !keep.has(w.image.url)).map((w) => deleteMedia(w.image)));
    await setWebsites(websites);
    refresh();
    return { ok: true, data: websites };
  } catch (err) {
    return fail(err);
  }
}

export async function saveTestimonials(input: Testimonial[]): Promise<Result<Testimonial[]>> {
  try {
    await requireAdmin();
    const testimonials = z.array(testimonialSchema).max(100).parse(input);
    const { testimonials: before } = await readContent();
    const keep = new Set(testimonials.map((t) => t.avatar?.url).filter(Boolean));
    await Promise.all(before.filter((t) => t.avatar && !keep.has(t.avatar.url)).map((t) => deleteMedia(t.avatar)));
    await setTestimonials(testimonials);
    refresh();
    return { ok: true, data: testimonials };
  } catch (err) {
    return fail(err);
  }
}

/* ------------------------------------------------------------------ */
/*  Messages & notifications                                            */
/* ------------------------------------------------------------------ */

export async function getUnread(): Promise<Result<UnreadSummary>> {
  try {
    await requireAdmin();
    return { ok: true, data: await unreadInquiries() };
  } catch (err) {
    return fail(err);
  }
}

export async function setMessageStatus(id: string, status: "new" | "read"): Promise<Result> {
  try {
    await requireAdmin();
    await updateInquiry(z.string().min(1).max(128).parse(id), { status: z.enum(["new", "read"]).parse(status) });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteMessage(id: string): Promise<Result> {
  try {
    await requireAdmin();
    await deleteInquiry(z.string().min(1).max(128).parse(id));
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function getPushKey(): Promise<Result<string | null>> {
  try {
    await requireAdmin();
    return { ok: true, data: pushAvailable() ? await pushPublicKey() : null };
  } catch (err) {
    return fail(err);
  }
}

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function subscribeToPush(input: unknown, device?: string): Promise<Result> {
  try {
    await requireAdmin();
    await savePushSubscription(subscriptionSchema.parse(input), typeof device === "string" ? device : undefined);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function unsubscribeFromPush(endpoint: string): Promise<Result> {
  try {
    await requireAdmin();
    await removePushSubscription(z.string().max(1000).parse(endpoint));
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function sendTestPush(): Promise<Result<number>> {
  try {
    await requireAdmin();
    const sent = await sendPush({ title: "Notifications are on", body: "New messages from your website will show up here.", tag: "test" });
    return { ok: true, data: sent };
  } catch (err) {
    return fail(err);
  }
}

/* ------------------------------------------------------------------ */
/*  Media & briefs                                                      */
/* ------------------------------------------------------------------ */

export async function getUploadTarget(): Promise<Result<UploadTarget>> {
  try {
    await requireAdmin();
    return { ok: true, data: uploadTarget() };
  } catch (err) {
    return fail(err);
  }
}

/** Discards a file that was uploaded but never saved (e.g. a cancelled edit). */
export async function discardMedia(media: Media): Promise<Result> {
  try {
    await requireAdmin();
    const { projects, brands, websites, testimonials } = await readContent();
    const used =
      projects.some((p) => p.assets.some((a) => a.media.url === media.url)) ||
      brands.some((b) => b.logo?.url === media.url) ||
      websites.some((w) => w.image?.url === media.url) ||
      testimonials.some((t) => t.avatar?.url === media.url);
    if (!used) await deleteMedia(media);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function getInquiries(): Promise<Result<Inquiry[]>> {
  try {
    await requireAdmin();
    return { ok: true, data: await listInquiries() };
  } catch (err) {
    return fail(err);
  }
}
