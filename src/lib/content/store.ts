import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { seedContent } from "./seed";
import type { Brand, Inquiry, Project, SiteContent } from "./types";

/**
 * Where portfolio content lives.
 *  - "firestore": production (Firebase Admin credentials present)
 *  - "local":     a JSON file in .data/ — for development on your machine
 *  - "readonly":  hosted without a database; shows the starter content
 */
export type StorageMode = "firestore" | "local" | "readonly";

export function storageMode(): StorageMode {
  if (getAdminDb()) return "firestore";
  if (process.env.VERCEL) return "readonly";
  return "local";
}

export const DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), ".data");
const CONTENT_FILE = path.join(/*turbopackIgnore: true*/ DATA_DIR, "content.json");
const INQUIRIES_FILE = path.join(/*turbopackIgnore: true*/ DATA_DIR, "inquiries.json");

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, file);
}

/* --------------------------------- reads -------------------------------- */

export async function readContent(): Promise<SiteContent> {
  const mode = storageMode();
  if (mode === "firestore") {
    const db = getAdminDb()!;
    const meta = await db.doc("site/meta").get();
    if (!meta.exists) return seedContent();
    const [projectsSnap, brandsDoc] = await Promise.all([db.collection("projects").get(), db.doc("site/brands").get()]);
    return {
      projects: projectsSnap.docs.map((d) => d.data() as Project),
      brands: ((brandsDoc.data()?.items as Brand[]) ?? []).filter(Boolean),
    };
  }
  if (mode === "local") {
    return (await readJson<SiteContent>(CONTENT_FILE)) ?? seedContent();
  }
  return seedContent();
}

/* -------------------------------- writes -------------------------------- */

function assertWritable() {
  if (storageMode() === "readonly") {
    throw new Error("This site isn't connected to a database yet. Add your Firebase keys to save changes.");
  }
}

/** First write: copy the starter content into the database. */
async function ensureInitialised(): Promise<SiteContent> {
  const mode = storageMode();
  if (mode === "local") {
    const existing = await readJson<SiteContent>(CONTENT_FILE);
    if (existing) return existing;
    const seed = seedContent();
    await writeJson(CONTENT_FILE, seed);
    return seed;
  }
  const db = getAdminDb()!;
  const meta = await db.doc("site/meta").get();
  if (meta.exists) return readContent();
  const seed = seedContent();
  const batch = db.batch();
  for (const p of seed.projects) batch.set(db.collection("projects").doc(p.id), p);
  batch.set(db.doc("site/brands"), { items: seed.brands });
  batch.set(db.doc("site/meta"), { initialisedAt: Date.now() });
  await batch.commit();
  return seed;
}

export async function upsertProjects(projects: Project[]) {
  assertWritable();
  const current = await ensureInitialised();
  if (storageMode() === "local") {
    const map = new Map(current.projects.map((p) => [p.id, p]));
    for (const p of projects) map.set(p.id, p);
    await writeJson(CONTENT_FILE, { ...current, projects: [...map.values()] });
    return;
  }
  const db = getAdminDb()!;
  const batch = db.batch();
  for (const p of projects) batch.set(db.collection("projects").doc(p.id), p);
  await batch.commit();
}

export async function removeProject(id: string) {
  assertWritable();
  const current = await ensureInitialised();
  if (storageMode() === "local") {
    await writeJson(CONTENT_FILE, { ...current, projects: current.projects.filter((p) => p.id !== id) });
    return;
  }
  await getAdminDb()!.collection("projects").doc(id).delete();
}

export async function setBrands(brands: Brand[]) {
  assertWritable();
  const current = await ensureInitialised();
  if (storageMode() === "local") {
    await writeJson(CONTENT_FILE, { ...current, brands });
    return;
  }
  await getAdminDb()!.doc("site/brands").set({ items: brands });
}

/* ------------------------------- inquiries ------------------------------ */

export async function saveInquiry(inquiry: Omit<Inquiry, "id">): Promise<string> {
  const mode = storageMode();
  if (mode === "firestore") {
    const ref = await getAdminDb()!.collection("inquiries").add(inquiry);
    return ref.id;
  }
  const id = `local-${crypto.randomUUID().slice(0, 12)}`;
  if (mode === "local") {
    const list = (await readJson<Inquiry[]>(INQUIRIES_FILE)) ?? [];
    await writeJson(INQUIRIES_FILE, [{ id, ...inquiry }, ...list].slice(0, 500));
  }
  return id;
}

export async function listInquiries(): Promise<Inquiry[]> {
  const mode = storageMode();
  if (mode === "firestore") {
    const snap = await getAdminDb()!.collection("inquiries").orderBy("createdAt", "desc").limit(200).get();
    return snap.docs.map((d) => {
      const data = d.data();
      const created = data.createdAt;
      return {
        id: d.id,
        ...data,
        createdAt: typeof created === "number" ? created : (created?.toMillis?.() ?? 0),
      } as Inquiry;
    });
  }
  if (mode === "local") return (await readJson<Inquiry[]>(INQUIRIES_FILE)) ?? [];
  return [];
}
