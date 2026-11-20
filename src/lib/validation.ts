import { z } from "zod";
import { budgets, projectServices, timelines } from "@/content/project";

export const inquirySchema = z.object({
  services: z.array(z.enum(projectServices)).min(1, "Pick at least one service"),
  budget: z.enum(budgets),
  timeline: z.enum(timelines),
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.email("Enter a valid email").max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10, "A few more words, please").max(2000),
  /** Honeypot — real people never fill this in. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export const paymentInitSchema = z.object({
  inquiryId: z.string().min(1).max(128),
  email: z.email(),
  name: z.string().trim().min(1).max(80),
});
