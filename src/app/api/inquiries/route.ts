import { after, NextResponse, type NextRequest } from "next/server";
import { inquirySchema } from "@/lib/validation";
import { saveInquiry, storageMode } from "@/lib/content/store";
import { notifyWhatsApp } from "@/lib/server/whatsapp";
import { paystackEnabled } from "@/lib/server/paystack";
import { formatBrief } from "@/lib/contact";

/**
 * POST /api/inquiries — keeps a copy of each project brief (Firestore, or a
 * local file in development) for the dashboard, and optionally pings the
 * studio's WhatsApp via the Cloud API.
 */
export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid brief." }, { status: 422 });
  }

  const { website, ...brief } = parsed.data;
  // Honeypot tripped: pretend success, store nothing.
  if (website) return NextResponse.json({ id: crypto.randomUUID() }, { status: 201 });

  const company = brief.company || undefined;
  after(() => notifyWhatsApp(`New brief from aibeevisuals.com\n\n${formatBrief({ ...brief, company })}`));

  try {
    const id = await saveInquiry({ ...brief, services: [...brief.services], company, status: "new", createdAt: Date.now() });
    return NextResponse.json({ id, stored: storageMode() !== "readonly", payments: paystackEnabled() }, { status: 201 });
  } catch (err) {
    console.error("[inquiries] could not store brief", err);
    return NextResponse.json({ id: `unsaved-${crypto.randomUUID().slice(0, 8)}`, stored: false }, { status: 201 });
  }
}
