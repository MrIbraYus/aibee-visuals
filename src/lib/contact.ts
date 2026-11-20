import { contact as site } from "@/content/contact";

export const whatsappUrl = (text?: string) =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const mailtoUrl = (subject?: string, body?: string) => {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const q = params.toString().replace(/\+/g, "%20");
  return `mailto:${site.email}${q ? `?${q}` : ""}`;
};

export const telUrl = () => `tel:${site.phoneIntl}`;

export type BriefFields = {
  services: readonly string[];
  budget: string;
  timeline: string;
  name: string;
  email: string;
  company?: string;
  message: string;
};

/** Plain-text brief used for WhatsApp, email and server notifications. */
export function formatBrief(b: BriefFields) {
  return [
    `Hi Aibee Visuals! I'd like to start a project.`,
    ``,
    `Name: ${b.name}`,
    b.company ? `Company: ${b.company}` : null,
    `Email: ${b.email}`,
    `Services: ${b.services.join(", ")}`,
    `Budget: ${b.budget}`,
    `Timeline: ${b.timeline}`,
    ``,
    b.message,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
