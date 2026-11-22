import { z } from "zod";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhone = (v: string) => /^\+?[\d\s().-]{7,20}$/.test(v) && v.replace(/\D/g, "").length >= 7;

/** A message sent from the website's "Send a message" form. */
export const messageSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  contact: z
    .string()
    .trim()
    .min(5, "Add your email or phone number")
    .max(120)
    .refine((v) => isEmail(v) || isPhone(v), "Enter a valid email or phone number"),
  message: z.string().trim().min(5, "Write a few words").max(2000),
  /** What the visitor was looking at, e.g. "Brand Identity". */
  topic: z.string().trim().max(120).optional().or(z.literal("")),
  /** Honeypot — real people never fill this in (the API quietly drops messages that do). */
  website: z.string().max(500).optional(),
});

export type MessageInput = z.infer<typeof messageSchema>;

export const contactKind = (v: string) => (isEmail(v.trim()) ? "email" : "phone");

export const paymentInitSchema = z.object({
  inquiryId: z.string().min(1).max(128),
  email: z.email(),
  name: z.string().trim().min(1).max(80),
});
