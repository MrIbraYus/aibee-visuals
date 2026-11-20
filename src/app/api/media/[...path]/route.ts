import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { UPLOAD_DIR } from "@/lib/media/server";

const TYPES: Record<string, string> = {
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  png: "image/png",
  jpg: "image/jpeg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
};

/** GET /api/media/<file> — serves files uploaded in local mode (with video range support). */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/media/[...path]">) {
  const { path: parts } = await params;
  const name = path.basename(parts.join("/"));
  const file = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const type = TYPES[name.split(".").pop() ?? ""] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (type === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'";

  const range = request.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
