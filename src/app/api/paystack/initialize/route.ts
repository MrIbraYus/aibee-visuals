import { NextResponse, type NextRequest } from "next/server";
import { DISCOVERY_FEE_GHS } from "@/content/project";
import { paymentInitSchema } from "@/lib/validation";
import { initializeTransaction, paystackEnabled } from "@/lib/server/paystack";

/**
 * POST /api/paystack/initialize — creates a Paystack transaction for the
 * discovery-session fee and returns its access code for the inline popup.
 * The amount is fixed on the server; the client never sends it.
 */
export async function POST(request: NextRequest) {
  if (!paystackEnabled()) {
    return NextResponse.json({ error: "Online payments aren't switched on yet." }, { status: 503 });
  }

  const parsed = paymentInitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment request." }, { status: 422 });

  const { inquiryId, email, name } = parsed.data;
  try {
    const tx = await initializeTransaction({
      email,
      amountGhs: DISCOVERY_FEE_GHS,
      reference: `aibee_${inquiryId.slice(0, 20)}_${crypto.randomUUID().slice(0, 8)}`,
      metadata: {
        inquiryId,
        custom_fields: [
          { display_name: "Client", variable_name: "client_name", value: name },
          { display_name: "Product", variable_name: "product", value: "Discovery session" },
        ],
      },
    });
    return NextResponse.json({ accessCode: tx.access_code, reference: tx.reference });
  } catch (err) {
    console.error("[paystack] initialize failed", err);
    return NextResponse.json({ error: "Couldn't start the payment. Please try again." }, { status: 502 });
  }
}
