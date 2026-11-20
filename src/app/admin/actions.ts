"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import {
  getSession,
  googleLoginEnabled,
  loginWithGoogle,
  loginWithPassword,
  logout as clearSession,
  passwordLoginEnabled,
  requireAdmin,
} from "@/lib/admin/auth";
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
  login: { google: boolean; password: boolean };
  content?: SiteContent;
};

/* ------------------------------------------------------------------ */
/*  Session                                                             */
/* ------------------------------------------------------------------ */

export async function getAdminState(): Promise<AdminState> {
  const session = await getSession();
  const base = {
    storage: storageMode(),
    media: mediaMode(),
    login: { google: googleLoginEnabled(), password: passwordLoginEnabled() },
  };
  if (!session) return { authed: false, ...base };
  return { authed: true, user: session.sub, ...base, content: await readContent() };
}

export async function signInWithPassword(password: string): Promise<Result> {
  if (!passwordLoginEnabled()) return { ok: false, error: "Password sign-in is turned off." };
  const ok = await loginWithPassword(String(password).slice(0, 200));
  return ok ? { ok: true, data: undefined } : { ok: false, error: "That password isn't right." };
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
