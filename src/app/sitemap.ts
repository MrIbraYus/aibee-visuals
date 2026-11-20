import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { getSiteContent } from "@/lib/content/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { projects } = await getSiteContent();
  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/work`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site.url}/motion`, changeFrequency: "weekly", priority: 0.8 },
    ...projects.map((p) => ({ url: `${site.url}/work/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
