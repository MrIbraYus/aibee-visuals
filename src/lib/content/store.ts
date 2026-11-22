import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdminDb } from "@/lib/server/firebase-admin";
import published from "@/content/published.json";
import { seedContent } from "./seed";
import { normalizeContent, type Brand, type Inquiry, type Project, type SiteContent, type Testimonial, type Website } from "./types";

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

/** Content published with `bun run content:publish`, else the bundled starter set. */
function starterContent(): SiteContent {
  const p = published as unknown as Partial<SiteContent> | null;
  return p ? normalizeContent(structuredClone(p)) : seedContent();
}

/* --------------------------------- reads -------------------------------- */

export async function readContent(): Promise<SiteContent> {
  const mode = storageMode();
  if (mode === "firestore") {
    const db = getAdminDb()!;
    const meta = await db.doc("site/meta").get();
    if (!meta.exists) return starterContent();
    const [projectsSnap, brandsDoc, websitesDoc, testimonialsDoc] = await Promise.all([
      db.collection("projects").get(),
      db.doc("site/brands").get(),
      db.doc("site/websites").get(),
      db.doc("site/testimonials").get(),
    ]);
    const starter = websitesDoc.exists && testimonialsDoc.exists ? null : starterContent();
    return {
      projects: projectsSnap.docs.map((d) => d.data() as Project),
      brands: ((brandsDoc.data()?.items as Brand[]) ?? []).filter(Boolean),
      websites: websitesDoc.exists ? ((websitesDoc.data()?.items as Website[]) ?? []).filter(Boolean) : starter!.websites,
      testimonials: testimonialsDoc.exists
        ? ((testimonialsDoc.data()?.items as Testimonial[]) ?? []).filter(Boolean)
        : starter!.testimonials,
    };
  }
  if (mode === "local") {
    const saved = await readJson<Partial<SiteContent>>(CONTENT_FILE);
    return saved ? normalizeContent(saved) : starterContent();
  }
  return starterContent();
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
    const existing = await readJson<Partial<SiteContent>>(CONTENT_FILE);
    if (existing) return normalizeContent(existing);
    const seed = starterContent();
    await writeJson(CONTENT_FILE, seed);
    return seed;
  }
  const db = getAdminDb()!;
  const meta = await db.doc("site/meta").get();
  if (meta.exists) return readContent();
  const seed = starterContent();
  const batch = db.batch();
  for (const p of seed.projects) batch.set(db.collection("projects").doc(p.id), p);
  batch.set(db.doc("site/brands"), { items: seed.brands });
  batch.set(db.doc("site/websites"), { items: seed.websites });
  batch.set(db.doc("site/testimonials"), { items: seed.testimonials });
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

export async function setWebsites(websites: Website[]) {
  assertWritable();
  const current = await ensureInitialised();
  if (storageMode() === "local") {
    await writeJson(CONTENT_FILE, { ...current, websites });
    return;
  }
  await getAdminDb()!.doc("site/websites").set({ items: websites });
}

export async function setTestimonials(testimonials: Testimonial[]) {
  assertWritable();
  const current = await ensureInitialised();
  if (storageMode() === "local") {
    await writeJson(CONTENT_FILE, { ...current, testimonials });
    return;
  }
  await getAdminDb()!.doc("site/testimonials").set({ items: testimonials });
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

export async function updateInquiry(id: string, patch: Pick<Inquiry, "status">) {
  const mode = storageMode();
  if (mode === "firestore") {
    await getAdminDb()!.collection("inquiries").doc(id).update(patch);
    return;
  }
  if (mode === "local") {
    const list = (await readJson<Inquiry[]>(INQUIRIES_FILE)) ?? [];
    await writeJson(INQUIRIES_FILE, list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
}

export async function deleteInquiry(id: string) {
  const mode = storageMode();
  if (mode === "firestore") {
    await getAdminDb()!.collection("inquiries").doc(id).delete();
    return;
  }
  if (mode === "local") {
    const list = (await readJson<Inquiry[]>(INQUIRIES_FILE)) ?? [];
    await writeJson(INQUIRIES_FILE, list.filter((i) => i.id !== id));
  }
}

export type UnreadSummary = { count: number; latest?: Pick<Inquiry, "id" | "name" | "message" | "createdAt"> };

/** How many messages are unread, plus the newest one (for notifications). */
export async function unreadInquiries(): Promise<UnreadSummary> {
  const mode = storageMode();
  if (mode === "firestore") {
    const col = getAdminDb()!.collection("inquiries");
    const [count, latest] = await Promise.all([
      col.where("status", "==", "new").count().get(),
      col.orderBy("createdAt", "desc").limit(1).get(),
    ]);
    const doc = latest.docs[0];
    const data = doc?.data();
    return {
      count: count.data().count,
      latest: doc
        ? { id: doc.id, name: String(data?.name ?? ""), message: String(data?.message ?? ""), createdAt: Number(data?.createdAt ?? 0) }
        : undefined,
    };
  }
  if (mode === "local") {
    const list = (await readJson<Inquiry[]>(INQUIRIES_FILE)) ?? [];
    const latest = list[0];
    return {
      count: list.filter((i) => i.status === "new").length,
      latest: latest ? { id: latest.id, name: latest.name, message: latest.message, createdAt: latest.createdAt } : undefined,
    };
  }
  return { count: 0 };
}
