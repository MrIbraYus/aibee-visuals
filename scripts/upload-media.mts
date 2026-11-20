/**
 * Uploads everything in public/portfolio to Cloudinary, keeping the folder
 * structure: public/portfolio/campusride/cover.webp → aibee/portfolio/campusride/cover
 *
 *   bun run media:upload
 *
 * Then reference it in src/content/projects.ts as
 *   "cloudinary:aibee/portfolio/campusride/cover"
 *
 * Needs NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (or CLOUDINARY_CLOUD_NAME),
 * CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!cloudName || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary credentials. Copy .env.example to .env.local and fill in the Cloudinary values.");
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });

const root = path.join(process.cwd(), "public/portfolio");
const entries = await readdir(root, { recursive: true, withFileTypes: true });
const files = entries.filter((e) => e.isFile() && /\.(webp|png|jpe?g|avif)$/i.test(e.name));

for (const file of files) {
  const full = path.join(file.parentPath, file.name);
  const rel = path.relative(root, full).replace(/\\/g, "/");
  const publicId = `aibee/portfolio/${rel.replace(/\.[^.]+$/, "")}`;
  const res = await cloudinary.uploader.upload(full, { public_id: publicId, overwrite: true, resource_type: "image" });
  console.log(`✓ cloudinary:${publicId}  ${res.width}×${res.height}`);
}
