/**
 * Publishes what you built in the local dashboard so the deployed site shows it.
 *
 *   npm run content:publish
 *
 *  1. Uploads every file in .data/uploads that your content uses to Cloudinary
 *     and switches the content to the Cloudinary copies.
 *  2. Writes the result to src/content/published.json (commit this file) — the
 *     live site uses it as its starting content.
 *  3. If the Firebase Admin keys are set, also writes it to Firestore so the
 *     /admin dashboard on the live site starts from the same content.
 *
 * Needs the Cloudinary keys in .env.local (loaded with --env-file).
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

type Media = { url: string; kind: "image" | "video"; poster?: string; [k: string]: unknown };
type Content = {
  projects: { id: string; assets: { media: Media }[] }[];
  brands: { logo?: Media }[];
  websites?: { image?: Media }[];
  testimonials?: { avatar?: Media }[];
};

const root = process.cwd();
const contentFile = path.join(root, ".data", "content.json");
const uploadsDir = path.join(root, ".data", "uploads");
const publishedFile = path.join(root, "src", "content", "published.json");

if (!existsSync(contentFile)) {
  console.error("Nothing to publish yet — .data/content.json doesn't exist. Make a change in /admin first.");
  process.exit(1);
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
if (!cloudName || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.local first.");
  process.exit(1);
}
cloudinary.config({ cloud_name: cloudName, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });
await cloudinary.api.ping();
console.log(`✓ Cloudinary connected (${cloudName})`);

const content = JSON.parse(await readFile(contentFile, "utf8")) as Content;
const moved = new Map<string, string>();

async function toCloud(url: string | undefined, kind: "image" | "video"): Promise<string | undefined> {
  if (!url || !url.startsWith("/api/media/")) return url;
  const done = moved.get(url);
  if (done) return done;
  const file = path.join(uploadsDir, path.basename(url));
  if (!existsSync(file)) {
    console.warn(`  ! missing file for ${url} — skipped`);
    return url;
  }
  const options = { asset_folder: "aibee", resource_type: kind } as const;
  const res: { public_id: string } =
    kind === "video"
      ? await new Promise((resolve, reject) =>
          cloudinary.uploader.upload_large(file, { ...options, chunk_size: 20_000_000 }, (err, r) => (err ? reject(err) : resolve(r as { public_id: string }))),
        )
      : await cloudinary.uploader.upload(file, options);
  const next = `cloudinary:${res.public_id}`;
  moved.set(url, next);
  console.log(`  ↑ ${path.basename(url)} → ${res.public_id}`);
  return next;
}

for (const project of content.projects) {
  for (const asset of project.assets) {
    asset.media.url = (await toCloud(asset.media.url, asset.media.kind))!;
    if (asset.media.poster) asset.media.poster = await toCloud(asset.media.poster, "image");
  }
}
for (const brand of content.brands) {
  if (brand.logo) brand.logo.url = (await toCloud(brand.logo.url, "image"))!;
}
content.websites ??= [];
content.testimonials ??= [];
for (const site of content.websites) {
  if (site.image) site.image.url = (await toCloud(site.image.url, "image"))!;
}
for (const t of content.testimonials) {
  if (t.avatar) t.avatar.url = (await toCloud(t.avatar.url, "image"))!;
}

await writeFile(contentFile, JSON.stringify(content, null, 2));
await writeFile(publishedFile, JSON.stringify(content, null, 2) + "\n");
console.log(`✓ ${moved.size} file(s) moved to Cloudinary`);
console.log(`✓ Wrote src/content/published.json — commit it, then deploy`);

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  const { cert, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = initializeApp({
    credential: cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: FIREBASE_PRIVATE_KEY.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n") }),
  });
  const db = getFirestore(app);
  const batch = db.batch();
  for (const p of content.projects) batch.set(db.collection("projects").doc(p.id), p);
  batch.set(db.doc("site/brands"), { items: content.brands });
  batch.set(db.doc("site/websites"), { items: content.websites });
  batch.set(db.doc("site/testimonials"), { items: content.testimonials });
  batch.set(db.doc("site/meta"), { initialisedAt: Date.now() });
  await batch.commit();
  console.log(`✓ Copied ${content.projects.length} projects and ${content.brands.length} brands to Firestore`);
} else {
  console.log("• Firebase Admin keys not set — skipped Firestore (the live dashboard will be read-only until they are).");
}
process.exit(0);
