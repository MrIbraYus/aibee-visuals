import type { ImageLoaderProps } from "next/image";
import type { Media } from "@/lib/content/types";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PREFIX = "cloudinary:";

export const isCloudinary = (url: string) => url.startsWith(PREFIX);
export const cloudinaryId = (url: string) => url.slice(PREFIX.length);

/** next/image loader for Cloudinary images (format + quality chosen per browser). */
export function cloudinaryImageLoader({ src, width, quality }: ImageLoaderProps) {
  const t = ["f_auto", "c_limit", `w_${width}`, quality ? `q_${quality}` : "q_auto"];
  return `https://res.cloudinary.com/${cloudName}/image/upload/${t.join(",")}/${src}`;
}

/** Props to spread on next/image for any stored image. */
export function imageProps(url: string) {
  if (isCloudinary(url)) return { src: cloudinaryId(url), loader: cloudinaryImageLoader };
  return { src: url };
}

/** Playable URL for a stored video. */
export function videoSrc(media: Media, width = 1600) {
  if (isCloudinary(media.url)) {
    return `https://res.cloudinary.com/${cloudName}/video/upload/q_auto,c_limit,w_${width}/${cloudinaryId(media.url)}.mp4`;
  }
  return media.url;
}

/** Still frame shown before a video plays. */
export function videoPoster(media: Media, width = 1200) {
  if (media.poster) {
    return isCloudinary(media.poster)
      ? `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_limit,w_${width}/${cloudinaryId(media.poster)}`
      : media.poster;
  }
  if (isCloudinary(media.url)) {
    return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,f_jpg,q_auto,c_limit,w_${width}/${cloudinaryId(media.url)}.jpg`;
  }
  return undefined;
}

const OPTIMIZER_WIDTHS = [256, 384, 640, 750, 828, 1080, 1200, 1920];

/** Routes a local image through Next's optimiser so thumbnails stay light. */
function optimisedLocal(url: string, width: number) {
  if (!url.startsWith("/") || /\.(svg|gif)$/i.test(url)) return url;
  const w = OPTIMIZER_WIDTHS.find((x) => x >= width) ?? 1920;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`;
}

/** Plain URL (thumbnails in the dashboard, og images…). */
export function mediaThumb(media: Media, width = 600) {
  if (media.kind === "video") {
    const poster = videoPoster(media, width);
    return poster && !isCloudinary(media.url) && !media.poster?.startsWith("cloudinary:") ? optimisedLocal(poster, width) : poster;
  }
  if (isCloudinary(media.url)) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_limit,w_${width}/${cloudinaryId(media.url)}`;
  }
  return optimisedLocal(media.url, width);
}

export const aspectOf = (m: Media) => (m.width && m.height ? m.width / m.height : 4 / 5);
