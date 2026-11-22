import Image from "next/image";
import type { Website } from "@/lib/content/types";
import { imageProps } from "@/lib/media/urls";
import { ArrowUpRight } from "@/components/ui/Primitives";

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const ACCENTS = ["#e90059", "#b7f500", "#1261f5", "#00b94f"];

/** The frame takes the screenshot's own shape (within reason) so nothing gets cropped. */
export const screenshotRatio = (site: Website) => {
  const { width, height } = site.image ?? {};
  if (!width || !height) return 16 / 10;
  return Math.min(Math.max(width / height, 1.45), 2.2);
};

/** A website as a small browser window: screenshot, name, story, link out. */
export function WebsiteCard({ site, index = 0, priority }: { site: Website; index?: number; priority?: boolean }) {
  const host = hostOf(site.url);
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <a href={site.url} target="_blank" rel="noopener noreferrer" className="group block" data-cursor="Visit">
      <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#1a1a1a] shadow-[0_30px_70px_-35px_rgba(0,0,0,0.9)] transition-colors duration-500 group-hover:border-white/25">
        <div className="flex h-9 items-center gap-3 border-b border-white/[0.06] px-3.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-magenta" />
            <span className="size-2.5 rounded-full bg-lime" />
            <span className="size-2.5 rounded-full bg-blue" />
          </span>
          <span className="mx-auto flex min-w-0 max-w-[70%] items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/60">
            <svg viewBox="0 0 24 24" className="size-3 shrink-0" aria-hidden>
              <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <span className="truncate">{host}</span>
          </span>
          <span className="w-[42px]" aria-hidden />
        </div>
        <div className="relative overflow-hidden bg-ink" style={{ aspectRatio: screenshotRatio(site) }}>
          {site.image ? (
            <Image
              {...imageProps(site.image.url)}
              alt={`${site.name} website`}
              fill
              preload={priority}
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover object-top transition-transform duration-[1.4s] ease-expo group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center" style={{ background: `radial-gradient(circle at 30% 20%, ${accent}55, transparent 60%), #111` }}>
              <span className="px-6 text-center text-[clamp(26px,3vw,44px)] font-semibold tracking-[-0.04em]">{site.name}</span>
            </div>
          )}
          <span className="absolute right-4 top-4 grid size-11 scale-75 place-items-center rounded-full bg-lime text-ink opacity-0 transition-all duration-500 ease-expo group-hover:scale-100 group-hover:opacity-100">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[20px] font-semibold leading-tight tracking-[-0.02em]">{site.name}</p>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-muted">
            <span className="size-1.5 rounded-full" style={{ background: accent }} />
            {host}
          </p>
        </div>
        {site.year && <p className="shrink-0 text-[13px] text-muted">{site.year}</p>}
      </div>
      {site.description && <p className="mt-3 line-clamp-3 text-[15px] leading-[1.55] text-white/75">{site.description}</p>}
      {site.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {site.tags.map((t) => (
            <li key={t} className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-white/80">
              {t}
            </li>
          ))}
        </ul>
      )}
    </a>
  );
}
