"use client";

import type { Media } from "@/lib/content/types";
import type { UploadTarget } from "@/lib/media/server";

export const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-m4v";

type VideoMeta = { width?: number; height?: number; duration?: number; poster?: Blob };

/** Reads a video's size/length and grabs a poster frame, entirely in the browser. */
function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    const done = (meta: VideoMeta) => {
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    const timer = window.setTimeout(() => done({}), 15000);
    video.onloadedmetadata = () => {
      // A frame ~30% in avoids the black/blank opening of most animations.
      const d = Number.isFinite(video.duration) ? video.duration : 2;
      video.currentTime = Math.min(Math.max(0.6, d * 0.3), 4);
    };
    video.onseeked = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = Number.isFinite(video.duration) ? video.duration : undefined;
      const scale = Math.min(1, 1280 / Math.max(1, width));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          window.clearTimeout(timer);
          done({ width, height, duration, poster: blob ?? undefined });
        },
        "image/webp",
        0.85,
      );
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      done({});
    };
  });
}

function post<T>(url: string, body: FormData, onProgress?: (p: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else {
        const msg = (data as { error?: string | { message?: string } } | null)?.error;
        reject(new Error(typeof msg === "string" ? msg : (msg?.message ?? `Upload failed (${xhr.status})`)));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.send(body);
  });
}

type CloudinaryResponse = {
  public_id: string;
  resource_type: "image" | "video" | "raw";
  width?: number;
  height?: number;
  duration?: number;
  bytes?: number;
  format?: string;
};

/** Uploads one file to wherever this site stores media and returns its Media record. */
export async function uploadFile(file: File, target: UploadTarget, onProgress?: (p: number) => void): Promise<Media> {
  if (target.mode === "none") throw new Error("Media storage isn't connected. Add your Cloudinary keys.");
  const isVideo = file.type.startsWith("video/");
  const meta = isVideo ? await readVideoMeta(file) : {};

  if (target.mode === "cloudinary") {
    const body = new FormData();
    Object.entries(target.fields).forEach(([k, v]) => body.append(k, v));
    body.append("file", file);
    const res = await post<CloudinaryResponse>(target.url, body, onProgress);
    return {
      url: `cloudinary:${res.public_id}`,
      kind: res.resource_type === "video" ? "video" : "image",
      width: res.width,
      height: res.height,
      duration: res.duration,
      bytes: res.bytes,
      format: res.format,
    };
  }

  // Local / development mode
  const body = new FormData();
  body.append("file", file);
  if (meta.width) body.append("width", String(meta.width));
  if (meta.height) body.append("height", String(meta.height));
  if (meta.duration) body.append("duration", String(meta.duration));
  const media = await post<Media>(target.url, body, (p) => onProgress?.(isVideo ? p * 0.92 : p));
  if (isVideo && meta.poster) {
    const posterBody = new FormData();
    posterBody.append("file", new File([meta.poster], "poster.webp", { type: "image/webp" }));
    const poster = await post<Media>(target.url, posterBody);
    media.poster = poster.url;
  }
  onProgress?.(1);
  return media;
}

export const formatBytes = (n?: number) =>
  !n ? "" : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export const formatDuration = (s?: number) => {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};
