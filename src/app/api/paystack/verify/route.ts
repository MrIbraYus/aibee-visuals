import { NextResponse, type NextRequest } from "next/server";
import { paystackEnabled, verifyTransaction } from "@/lib/server/paystack";
import { recordPayment } from "@/lib/server/payments";

/** GET /api/paystack/verify?reference=… — confirms a charge server-side. */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference || reference.length > 100) {
    return NextResponse.json({ error: "Missing reference." }, { status: 400 });
  }
  if (!paystackEnabled()) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }
  try {
    const tx = await verifyTransaction(reference);
    const ok = await recordPayment(tx);
    return NextResponse.json({ status: ok ? "success" : tx.status });
  } catch (err) {
    console.error("[paystack] verify failed", err);
    return NextResponse.json({ error: "Verification failed." }, { status: 502 });
  }
}
