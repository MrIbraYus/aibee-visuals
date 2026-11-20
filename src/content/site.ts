import { contact } from "./contact";

export const site = {
  name: "Aibee Visuals",
  tagline: "Creative. Strategic. Impactful.",
  description:
    "Aibee Visuals is an independent design studio. We combine strategic thinking, bold creativity and digital expertise to build distinctive brands and meaningful digital experiences.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://aibeevisuals.com",
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

export const heroPills = [
  { label: "Brand Identity", className: "bg-magenta text-white", href: "#services" },
  { label: "Logo Design", className: "bg-lime text-ink", href: "#services" },
  { label: "UI/UX & Web", className: "bg-blue text-white", href: "#services" },
  { label: "Social Media", className: "bg-emerald text-ink", href: "#services" },
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
