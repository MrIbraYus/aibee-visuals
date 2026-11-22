import { cacheLife, cacheTag } from "next/cache";
import { readContent } from "./store";
import { heroItemsOf, motionItemsOf, sortByOrder, type Project, type SiteContent } from "./types";

export const CONTENT_TAG = "content";

/**
 * Published content for the public site. Cached and tagged so a save in
 * /admin (updateTag("content")) refreshes every page that uses it.
 */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  const content = await readContent();
  return {
    projects: sortByOrder(content.projects.filter((p) => p.published)),
    brands: sortByOrder(content.brands),
    websites: sortByOrder(content.websites.filter((w) => w.published)),
    testimonials: sortByOrder(content.testimonials.filter((t) => t.published)),
  };
}

export async function getProjectBySlug(slug: string): Promise<{ project: Project; next: Project } | null> {
  const { projects } = await getSiteContent();
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  return { project: projects[index], next: projects[(index + 1) % projects.length] };
}

export async function getHomeData() {
  const { projects, brands, websites, testimonials } = await getSiteContent();
  return {
    projects,
    brands,
    websites,
    testimonials,
    featured: projects.filter((p) => p.featured).slice(0, 5),
    hero: heroItemsOf(projects),
    motion: motionItemsOf(projects),
  };
}
