import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paystack.co";

/** Only a secret key (sk_test_… / sk_live_…) can create transactions. */
export const paystackEnabled = () => /^sk_(test|live)_/.test(process.env.PAYSTACK_SECRET_KEY ?? "");

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = (await res.json()) as { status: boolean; message: string; data: T };
  if (!res.ok || !body.status) throw new Error(body.message || `Paystack error ${res.status}`);
  return body.data;
}

export type InitializeResult = { authorization_url: string; access_code: string; reference: string };

/** Amount is in GHS; Paystack expects the lowest denomination (pesewas). */
export function initializeTransaction(input: {
  email: string;
  amountGhs: number;
  reference: string;
  metadata: Record<string, unknown>;
}) {
  return paystack<InitializeResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountGhs * 100),
      currency: "GHS",
      reference: input.reference,
      metadata: input.metadata,
      channels: ["card", "mobile_money", "bank"],
    }),
  });
}

export type VerifyResult = {
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "reversed";
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  metadata: { inquiryId?: string } | null;
  customer: { email: string };
};

export function verifyTransaction(reference: string) {
  return paystack<VerifyResult>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Validates the `x-paystack-signature` header of a webhook request. */
export function isValidSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
