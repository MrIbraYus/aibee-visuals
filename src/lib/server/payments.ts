import { FieldValue } from "firebase-admin/firestore";
import { DISCOVERY_FEE_GHS } from "@/content/project";
import { getAdminDb } from "./firebase-admin";
import type { VerifyResult } from "./paystack";

/**
 * Records a verified Paystack charge against its inquiry. Safe to call more
 * than once for the same reference (verify endpoint + webhook).
 */
export async function recordPayment(tx: VerifyResult) {
  const ok = tx.status === "success" && tx.currency === "GHS" && tx.amount >= Math.round(DISCOVERY_FEE_GHS * 100);
  const db = getAdminDb();
  const inquiryId = tx.metadata?.inquiryId;
  if (db && inquiryId) {
    await db
      .collection("inquiries")
      .doc(inquiryId)
      .set(
        {
          payment: {
            status: ok ? "paid" : tx.status,
            reference: tx.reference,
            amount: tx.amount / 100,
            currency: tx.currency,
            paidAt: tx.paid_at,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }
  return ok;
}
