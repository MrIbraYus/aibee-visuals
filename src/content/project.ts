/** Project-brief options shared by the drawer (client) and API routes (server). */
export const budgets = ["< GH₵5k", "GH₵5k – 15k", "GH₵15k – 40k", "GH₵40k +"] as const;
export const timelines = ["ASAP", "1 – 2 months", "3 – 6 months", "Flexible"] as const;
export const projectServices = [
  "Brand Identity",
  "Logo Design",
  "UI/UX & Web",
  "Social Media",
  "Graphic Design",
  "Campaign",
] as const;

/** Booking fee (in GHS) for a paid discovery session, charged through Paystack. */
export const DISCOVERY_FEE_GHS = Number(process.env.NEXT_PUBLIC_DISCOVERY_FEE_GHS ?? 500);
