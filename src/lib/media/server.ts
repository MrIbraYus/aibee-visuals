import { unlink } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import type { Media } from "@/lib/content/types";
import { DATA_DIR } from "@/lib/content/store";
import { cloudinaryId, isCloudinary } from "./urls";

export type MediaMode = "cloudinary" | "local" | "none";

export const UPLOAD_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "uploads");
export const LOCAL_PREFIX = "/api/media/";

const cloud = () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});

export function mediaMode(): MediaMode {
  const c = cloud();
  if (c.cloudName && c.apiKey && c.apiSecret) return "cloudinary";
  if (process.env.VERCEL) return "none";
  return "local";
}

export type UploadTarget =
  | { mode: "cloudinary"; url: string; fields: Record<string, string> }
  | { mode: "local"; url: string }
  | { mode: "none" };

/** Short-lived signed parameters so the browser can upload straight to Cloudinary. */
export function uploadTarget(): UploadTarget {
  const mode = mediaMode();
  if (mode === "local") return { mode, url: "/api/admin/media" };
  if (mode === "none") return { mode };
  const { cloudName, apiKey, apiSecret } = cloud();
  // `asset_folder` works with both fixed and dynamic folder Cloudinary accounts.
  const params = { timestamp: String(Math.round(Date.now() / 1000)), asset_folder: "aibee" };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret!);
  return {
    mode,
    url: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    fields: { ...params, api_key: apiKey!, signature },
  };
}

/** Best-effort removal of an uploaded file (bundled site files are never touched). */
export async function deleteMedia(media: Media | undefined) {
  if (!media) return;
  const urls = [media.url, media.poster].filter(Boolean) as string[];
  for (const url of urls) {
    try {
      if (url.startsWith(LOCAL_PREFIX)) {
        const file = path.basename(url.slice(LOCAL_PREFIX.length));
        await unlink(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, file));
      } else if (isCloudinary(url) && mediaMode() === "cloudinary") {
        const { cloudName, apiKey, apiSecret } = cloud();
        cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
        const resourceType = url === media.url && media.kind === "video" ? "video" : "image";
        await cloudinary.uploader.destroy(cloudinaryId(url), { resource_type: resourceType });
      }
    } catch (err) {
      console.warn("[media] could not delete", url, err);
    }
  }
}
