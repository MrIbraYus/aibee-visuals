import { NextResponse, type NextRequest } from "next/server";
import { isValidSignature, verifyTransaction } from "@/lib/server/paystack";
import { recordPayment } from "@/lib/server/payments";

/**
 * POST /api/paystack/webhook — Paystack → server notifications.
 * Set this URL in the Paystack dashboard (Settings → API Keys & Webhooks).
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(raw) as { event: string; data: { reference: string } };
  if (event.event === "charge.success") {
    try {
      // Re-verify instead of trusting the payload blindly.
      const tx = await verifyTransaction(event.data.reference);
      await recordPayment(tx);
    } catch (err) {
      console.error("[paystack] webhook processing failed", err);
      return NextResponse.json({ error: "Processing failed." }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
