import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getSession } from "@/lib/admin/auth";
import { LOCAL_PREFIX, mediaMode, UPLOAD_DIR } from "@/lib/media/server";
import type { Media } from "@/lib/content/types";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
const MAX_BYTES = 500 * 1024 * 1024;

/**
 * POST /api/admin/media — uploads used in local/dev mode (production uploads
 * go straight to Cloudinary). Images are converted to WebP (max 2400px).
 */
export async function POST(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (mediaMode() !== "local") return NextResponse.json({ error: "Local uploads are disabled here." }, { status: 400 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Files must be under 500 MB." }, { status: 413 });

  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: `${file.type || "This file type"} isn't supported.` }, { status: 415 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isImage) {
    const passthrough = file.type === "image/svg+xml" || file.type === "image/gif";
    if (passthrough) {
      const ext = file.type === "image/svg+xml" ? "svg" : "gif";
      const name = `${id}.${ext}`;
      await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), buffer);
      const meta = file.type === "image/gif" ? await sharp(buffer).metadata() : null;
      const media: Media = { url: LOCAL_PREFIX + name, kind: "image", bytes: buffer.length, format: ext, width: meta?.width, height: meta?.pageHeight ?? meta?.height };
      return NextResponse.json(media);
    }
    const name = `${id}.webp`;
    const out = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
    await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), out.data);
    const media: Media = { url: LOCAL_PREFIX + name, kind: "image", width: out.info.width, height: out.info.height, bytes: out.info.size, format: "webp" };
    return NextResponse.json(media);
  }

  const ext = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/x-m4v": "m4v" }[file.type] ?? "mp4";
  const name = `${id}.${ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), buffer);
  const num = (k: string) => {
    const v = Number(form.get(k));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  const media: Media = {
    url: LOCAL_PREFIX + name,
    kind: "video",
    width: num("width"),
    height: num("height"),
    duration: num("duration"),
    bytes: buffer.length,
    format: ext,
  };
  return NextResponse.json(media);
}
