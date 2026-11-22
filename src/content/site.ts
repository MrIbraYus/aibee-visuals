import { contact } from "./contact";

/**
 * The live address, from NEXT_PUBLIC_SITE_URL. Tolerates a trailing slash, a
 * missing https:// or an empty value, so a small typo in the hosting settings
 * can't produce "//work" links or crash every page.
 */
function siteUrl() {
  const fallback = "https://aibeevisuals.vercel.app";
  let raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (!raw) return fallback;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    return new URL(raw).origin;
  } catch {
    return fallback;
  }
}

export const site = {
  name: "Aibee Visuals",
  tagline: "Creative. Strategic. Impactful.",
  description:
    "Aibee Visuals is an independent design studio. We combine strategic thinking, bold creativity and digital expertise to build distinctive brands and meaningful digital experiences.",
  url: siteUrl(),
  ...contact,
  socials: [
    { label: "Instagram", href: "https://instagram.com/aibeevisuals", short: "ig" },
    { label: "Behance", href: "https://behance.net/aibeevisuals", short: "be" },
    { label: "LinkedIn", href: "https://linkedin.com/company/aibeevisuals", short: "in" },
  ],
} as const;

export const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#studio" },
  { label: "Services", href: "#services" },
  { label: "Work", href: "#work" },
  { label: "Motion", href: "#motion" },
  { label: "Contact", href: "#contact" },
] as const;

/** What we do — the hero pills cycle through these, one pill at a time. */
export const whatWeDo = [
  "Brand Identity",
  "Logo Design",
  "UI/UX Design",
  "Web Development",
  "Digital Illustration",
  "Brand Design",
  "Graphic Design",
  "Visual Identity",
  "Frontend Development",
  "Social Media Design",
  "Creative Direction",
  "Digital Experiences",
  "Content Creation",
  "IT Support",
  "Adobe Illustrator",
  "AI-Powered Workflows",
] as const;

/** Hero pill colours: resting look and hover look (text always contrasts its background). */
export const pillTones = [
  "bg-magenta text-white hover:bg-lime hover:text-ink hover:shadow-[0_10px_34px_rgba(183,245,0,0.35)]",
  "bg-lime text-ink hover:bg-magenta hover:text-white hover:shadow-[0_10px_34px_rgba(233,0,89,0.4)]",
  "bg-blue text-white hover:bg-emerald hover:text-ink hover:shadow-[0_10px_34px_rgba(0,185,79,0.4)]",
  "bg-emerald text-ink hover:bg-blue hover:text-white hover:shadow-[0_10px_34px_rgba(18,97,245,0.45)]",
] as const;

export type Service = {
  title: string;
  blurb: string;
  deliverables: string[];
  icon: "asterisk" | "layers" | "flower" | "cone";
  accent: string;
};

export const services: Service[] = [
  {
    title: "Brand Identity",
    blurb: "Build a brand that stands out.",
    deliverables: ["Brand strategy", "Logo systems", "Visual language", "Brand guidelines"],
    icon: "asterisk",
    accent: "#7ee21b",
  },
  {
    title: "Digital Experiences",
    blurb: "Create engaging digital experiences.",
    deliverables: ["UI/UX design", "Websites", "Product design", "Prototyping"],
    icon: "layers",
    accent: "#1261f5",
  },
  {
    title: "Graphic Design",
    blurb: "Turn ideas into stunning visuals.",
    deliverables: ["Campaign art", "Print & packaging", "Illustration", "Motion graphics"],
    icon: "flower",
    accent: "#ff3d8b",
  },
  {
    title: "Social Media",
    blurb: "Grow your brand online.",
    deliverables: ["Content strategy", "Social templates", "Ad creatives", "Community kits"],
    icon: "cone",
    accent: "#00b94f",
  },
];

export const steps = [
  { title: "Discover", text: "Understand your vision and goals." },
  { title: "Define", text: "Plan a strategy that works." },
  { title: "Design", text: "Create with purpose." },
  { title: "Deliver", text: "Launch and grow together." },
] as const;

export { budgets, timelines, projectServices, DISCOVERY_FEE_GHS } from "./project";
