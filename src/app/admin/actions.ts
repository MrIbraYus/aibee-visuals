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
import { listInquiries, readContent, removeProject, setBrands, storageMode, upsertProjects, type StorageMode } from "@/lib/content/store";
import { brandSchema, projectSchema, type Brand, type Inquiry, type Media, type Project, type SiteContent } from "@/lib/content/types";
import { deleteMedia, mediaMode, uploadTarget, type MediaMode, type UploadTarget } from "@/lib/media/server";

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
};

/* ------------------------------------------------------------------ */
/*  Session                                                             */
/* ------------------------------------------------------------------ */

export async function getAdminState(): Promise<AdminState> {
  const session = await getSession();
  const secret = await secretInfo();
  const base = {
    storage: storageMode(),
    media: mediaMode(),
    login: { google: googleLoginEnabled(), password: secret.enabled, pinLength: secret.pinLength },
  };
  if (!session) return { authed: false, ...base };
  return { authed: true, user: session.sub, ...base, content: await readContent() };
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function signInWithPassword(password: string): Promise<Result> {
  if (!(await secretInfo()).enabled) return { ok: false, error: "No dashboard PIN is set up yet." };
  const ip = await clientIp();
  const locked = await lockoutMinutes(ip);
  if (locked) return { ok: false, error: `Too many wrong tries. Try again in ${locked} minute${locked > 1 ? "s" : ""}.` };
  const ok = await loginWithPassword(String(password).slice(0, 200));
  await recordAttempt(ip, ok);
  return ok ? { ok: true, data: undefined } : { ok: false, error: "That PIN isn't right." };
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
  const res = await loginWithGoogle(String(idToken));
  return res.ok ? { ok: true, data: undefined } : { ok: false, error: res.error ?? "Sign-in failed." };
}

export async function signOut(): Promise<Result> {
  await clearSession();
  return { ok: true, data: undefined };
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
    const { projects, brands } = await readContent();
    const used =
      projects.some((p) => p.assets.some((a) => a.media.url === media.url)) || brands.some((b) => b.logo?.url === media.url);
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
