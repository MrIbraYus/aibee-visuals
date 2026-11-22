import { after, NextResponse, type NextRequest } from "next/server";
import { messageSchema } from "@/lib/validation";
import { saveInquiry, storageMode } from "@/lib/content/store";
import { notifyWhatsApp } from "@/lib/server/whatsapp";
import { sendPush } from "@/lib/server/push";
import type { Inquiry } from "@/lib/content/types";

/** Simple per-visitor limit so the inbox (and your phone) can't be flooded. */
const WINDOW = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (hits.length >= MAX_PER_WINDOW) return true;
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return false;
}

/**
 * POST /api/inquiries — a message from the website. It lands in the
 * dashboard's Messages inbox and pings every device that turned on
 * notifications (plus WhatsApp, if the Cloud API keys are set).
 */
export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 422 });
  }

  const { website, topic, ...fields } = parsed.data;
  // Honeypot tripped: pretend success, store nothing.
  if (website) return NextResponse.json({ id: crypto.randomUUID() }, { status: 201 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "You've sent a few messages already. Please reach us on WhatsApp instead." }, { status: 429 });
  }

  if (storageMode() === "readonly") {
    return NextResponse.json({ error: "Messages can't be received right now. Please reach us on WhatsApp." }, { status: 503 });
  }

  const message: Omit<Inquiry, "id"> = { ...fields, status: "new", createdAt: Date.now(), ...(topic ? { topic } : {}) };
  let id: string;
  try {
    id = await saveInquiry(message);
  } catch (err) {
    console.error("[messages] could not store message", err);
    return NextResponse.json({ error: "Your message couldn't be sent. Please reach us on WhatsApp." }, { status: 500 });
  }

  after(async () => {
    const preview = fields.message.replace(/\s+/g, " ").slice(0, 140);
    await Promise.allSettled([
      sendPush({ title: `New message from ${fields.name}`, body: preview, tag: `message-${id}` }),
      notifyWhatsApp(
        [`New message from your website`, ``, `Name: ${fields.name}`, `Contact: ${fields.contact}`, topic ? `About: ${topic}` : null, ``, fields.message]
          .filter((l) => l !== null)
          .join("\n"),
      ),
    ]);
  });

  return NextResponse.json({ id }, { status: 201 });
}
