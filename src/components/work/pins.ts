import { coverOf, type Asset, type Media, type Project, type Website } from "@/lib/content/types";

/** One card on the Work wall: a single file from a project, or a website. */
export type PinKind = "design" | "logo" | "illustration" | "motion" | "website";

export type AssetPin = { id: string; kind: Exclude<PinKind, "website">; media: Media; title: string; asset: Asset; project: Project };
export type WebsitePin = { id: string; kind: "website"; media?: Media; title: string; site: Website };
export type Pin = AssetPin | WebsitePin;

export const pinLabels: Record<PinKind, { one: string; many: string }> = {
  design: { one: "Design", many: "Designs" },
  logo: { one: "Logo", many: "Logos" },
  illustration: { one: "Illustration", many: "Illustrations" },
  motion: { one: "Motion", many: "Motion" },
  website: { one: "Website", many: "Websites" },
};

export const sitePinId = (site: Website) => `site-${site.id}`;

export function projectPins(project: Project): AssetPin[] {
  const cover = coverOf(project);
  const assets = [...project.assets].sort((a, b) => Number(b.id === cover?.id) - Number(a.id === cover?.id));
  return assets.map((asset) => ({
    id: asset.id,
    kind: asset.type,
    media: asset.media,
    title: asset.title?.trim() || project.title,
    asset,
    project,
  }));
}

export const websitePin = (site: Website): WebsitePin => ({ id: sitePinId(site), kind: "website", media: site.image, title: site.name, site });

/**
 * Every published file and website, dealt out round-robin (one from each
 * project in turn) so the wall mixes brands instead of showing ten designs
 * from the same project in a row.
 */
export function buildPins(projects: Project[], websites: Website[]): Pin[] {
  const groups: Pin[][] = projects.map((p) => projectPins(p));
  groups.splice(1, 0, websites.map(websitePin));
  const out: Pin[] = [];
  for (let round = 0; groups.some((g) => round < g.length); round++) {
    for (const g of groups) if (round < g.length) out.push(g[round]);
  }
  return out;
}

/** Card shape: the work's own proportions, kept within sensible limits. */
export function pinRatio(pin: Pin) {
  if (pin.kind === "logo") return 1;
  const m = pin.media;
  if (!m?.width || !m?.height) return pin.kind === "website" ? 16 / 10 : 4 / 5;
  return Math.min(Math.max(m.width / m.height, 0.6), 1.9);
}
