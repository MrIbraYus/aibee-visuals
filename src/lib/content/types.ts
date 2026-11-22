import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Portfolio content model — managed from /admin                      */
/* ------------------------------------------------------------------ */

export const categories = [
  "Brand Identity",
  "Campaign",
  "Social Media",
  "UI/UX & Web",
  "Motion",
  "Print & Packaging",
  "Logo Design",
  "Illustration",
] as const;
export type Category = (typeof categories)[number];

/** What an asset is, inside a brand's project page. */
export const assetTypes = ["design", "logo", "illustration", "motion"] as const;
export type AssetType = (typeof assetTypes)[number];
export const assetTypeLabels: Record<AssetType, string> = {
  design: "Designs",
  logo: "Logos",
  illustration: "Illustrations",
  motion: "Motion",
};

export const motionKinds = ["Logo animation", "Motion graphics", "Video"] as const;
export type MotionKind = (typeof motionKinds)[number];

/**
 * A stored file. `url` is one of:
 *   "/portfolio/…" or "/brands/…"   bundled with the site
 *   "/api/media/…"                  uploaded in local/dev mode
 *   "cloudinary:<public-id>"        uploaded to Cloudinary (production)
 */
export const mediaSchema = z.object({
  url: z.string().min(1).max(500),
  kind: z.enum(["image", "video"]),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  duration: z.number().nonnegative().optional(),
  poster: z.string().max(500).optional(),
  bytes: z.number().nonnegative().optional(),
  format: z.string().max(20).optional(),
});
export type Media = z.infer<typeof mediaSchema>;

export const assetSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(assetTypes),
  media: mediaSchema,
  title: z.string().max(140).optional(),
  motionKind: z.enum(motionKinds).optional(),
  /** Show this image on the homepage hero arc. */
  hero: z.boolean().optional(),
  heroOrder: z.number().optional(),
  /** Feature this video in the homepage motion section. */
  reel: z.boolean().optional(),
  createdAt: z.number(),
});
export type Asset = z.infer<typeof assetSchema>;

export const projectSchema = z.object({
  id: z.string().min(1).max(64),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  client: z.string().trim().min(1, "Add the brand / client name").max(80),
  title: z.string().trim().min(1, "Add a title").max(140),
  category: z.enum(categories),
  year: z.string().trim().max(10),
  summary: z.string().trim().max(600),
  services: z.array(z.string().trim().min(1).max(60)).max(12),
  accent: z.string().max(20).optional(),
  featured: z.boolean(),
  published: z.boolean(),
  order: z.number(),
  coverId: z.string().max(64).optional(),
  assets: z.array(assetSchema).max(300),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Project = z.infer<typeof projectSchema>;

export const brandSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1, "Add the brand name").max(60),
  logo: mediaSchema.optional(),
  url: z.string().max(300).optional(),
  order: z.number(),
});
export type Brand = z.infer<typeof brandSchema>;

/** A website you designed or built — shown in the homepage websites section. */
export const websiteSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1, "Add the website name").max(80),
  url: z.url({ protocol: /^https?$/, error: "Add the full web address, e.g. https://example.com" }).max(300),
  description: z.string().trim().max(600),
  /** Screenshot of the site's hero section. */
  image: mediaSchema.optional(),
  /** Short chips like "Next.js", "E-commerce", "UI/UX". */
  tags: z.array(z.string().trim().min(1).max(40)).max(8),
  year: z.string().trim().max(10).optional(),
  published: z.boolean(),
  order: z.number(),
  createdAt: z.number(),
});
export type Website = z.infer<typeof websiteSchema>;

export const testimonialSchema = z.object({
  id: z.string().min(1).max(64),
  quote: z.string().trim().min(1, "Add what the client said").max(700),
  name: z.string().trim().min(1, "Add the client's name").max(80),
  /** e.g. "Founder, UrbanDrop" */
  role: z.string().trim().max(120).optional(),
  avatar: mediaSchema.optional(),
  published: z.boolean(),
  order: z.number(),
  createdAt: z.number(),
});
export type Testimonial = z.infer<typeof testimonialSchema>;

export type SiteContent = { projects: Project[]; brands: Brand[]; websites: Website[]; testimonials: Testimonial[] };

/** Fills in lists that older saved content doesn't have yet. */
export const normalizeContent = (c: Partial<SiteContent> | null | undefined): SiteContent => ({
  projects: c?.projects ?? [],
  brands: c?.brands ?? [],
  websites: c?.websites ?? [],
  testimonials: c?.testimonials ?? [],
});

/** A message sent from the website (older entries are full project briefs). */
export type Inquiry = {
  id: string;
  name: string;
  /** Email address or phone number the visitor left. */
  contact?: string;
  email?: string;
  message: string;
  /** What they were looking at when they wrote, e.g. "Brand Identity". */
  topic?: string;
  status: "new" | "read" | (string & {});
  createdAt: number;
  company?: string;
  services?: string[];
  budget?: string;
  timeline?: string;
};

/* ------------------------------------------------------------------ */
/*  Derived helpers (safe on server and client)                        */
/* ------------------------------------------------------------------ */

export const isImage = (a: Asset) => a.media.kind === "image";
export const isVideo = (a: Asset) => a.media.kind === "video";

/** The asset used as a project's cover image. */
export function coverOf(project: Project): Asset | undefined {
  const images = project.assets.filter(isImage);
  return images.find((a) => a.id === project.coverId) ?? images[0];
}

export const sortByOrder = <T extends { order: number }>(list: T[]) => [...list].sort((a, b) => a.order - b.order);

export type HeroItem = { asset: Asset; project: Project };

export function heroItemsOf(projects: Project[]): HeroItem[] {
  return projects
    .flatMap((project) => project.assets.filter((a) => a.hero && isImage(a)).map((asset) => ({ asset, project })))
    .sort((a, b) => (a.asset.heroOrder ?? 0) - (b.asset.heroOrder ?? 0));
}

export type MotionItem = { asset: Asset; project: Project };

export function motionItemsOf(projects: Project[]): MotionItem[] {
  return projects
    .flatMap((project) => project.assets.filter((a) => a.type === "motion" && isVideo(a)).map((asset) => ({ asset, project })))
    .sort((a, b) => b.asset.createdAt - a.asset.createdAt);
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "project";

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
    : Math.random().toString(36).slice(2, 18);
