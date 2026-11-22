"use client";

import Image from "next/image";
import { useRef } from "react";
import type { Website } from "@/lib/content/types";
import { imageProps } from "@/lib/media/urls";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { ArrowUpRight } from "@/components/ui/Primitives";
import { prefersReducedMotion } from "@/lib/utils";

const ACCENTS = ["#e90059", "#b7f500", "#1261f5", "#00b94f"];
/** Cards stack this far below the nav, each one peeking a little lower. */
const STACK_TOP = 96;
const STACK_STEP = 16;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/**
 * Websites we've designed and built. On large screens the cards stack as you
 * scroll — each new site slides over the last, which sinks back into the
 * dark like a browser tab left behind.
 */
export function Websites({ sites }: { sites: Website[] }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(ref);
      const split = SplitText.create(q("[data-sites-heading]"), { type: "lines,words", mask: "lines" });
      gsap
        .timeline({ scrollTrigger: { trigger: ref.current, start: "top 72%" } })
        .from(split.words, { yPercent: 110, stagger: 0.04, duration: 1.1 }, 0)
        .from(q("[data-sites-lede]"), { autoAlpha: 0, y: 24, duration: 1 }, 0.25);

      const cards = q("[data-site-card]") as HTMLElement[];
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (min-height: 720px)", () => {
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next) return;
          const inner = card.querySelector("[data-site-inner]");
          const shade = card.querySelector("[data-site-shade]");
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: next, start: "top bottom", end: `top ${STACK_TOP + (i + 1) * STACK_STEP}px`, scrub: true },
          });
          tl.to(inner, { scale: 0.92, yPercent: -2 }, 0).to(shade, { opacity: 0.7 }, 0);
        });
      });
      mm.add("(max-width: 1023px), (max-height: 719px)", () => {
        cards.forEach((card) => {
          gsap.from(card, { autoAlpha: 0, y: 50, duration: 1.1, scrollTrigger: { trigger: card, start: "top 88%" } });
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section id="websites" ref={ref} className="relative z-10 bg-ink" aria-labelledby="websites-title">
      <div className="frame pb-[clamp(56px,7vw,110px)] pt-[clamp(72px,8vw,120px)]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <h2
            id="websites-title"
            data-sites-heading
            className="max-w-[15ch] text-[clamp(36px,3.9vw,56px)] font-semibold leading-[1.02] tracking-[-0.04em]"
          >
            Websites we&apos;ve designed <span className="serif-i font-normal">&amp; built.</span>
          </h2>
          <p data-sites-lede className="max-w-[40ch] text-[15px] leading-[1.55] text-muted">
            From first wireframe to launch day: fast, responsive sites that carry the brand all the way to the screen.
          </p>
        </div>

        <ol className="mt-10 flex flex-col gap-5 lg:mt-16 stack:gap-8">
          {sites.map((site, i) => (
            <li
              key={site.id}
              data-site-card
              className="stack:sticky"
              style={{ top: STACK_TOP + i * STACK_STEP }}
            >
              <SiteCard site={site} accent={ACCENTS[i % ACCENTS.length]} index={i} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SiteCard({ site, accent, index }: { site: Website; accent: string; index: number }) {
  const host = hostOf(site.url);
  const flip = index % 2 === 1;

  return (
    <article
      data-site-inner
      className="relative origin-top overflow-hidden rounded-[28px] border border-white/10 bg-[#0f0f0f] p-3 will-change-transform sm:p-4 lg:p-5"
      style={{ backgroundImage: `radial-gradient(120% 90% at ${flip ? "0%" : "100%"} 0%, ${accent}26, transparent 55%)` }}
    >
      <div className={`grid items-center gap-5 lg:gap-12 ${flip ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"}`}>
        {/* Details */}
        <div className={`order-2 px-2 pb-2 sm:px-3 lg:px-4 lg:pb-0 ${flip ? "lg:order-2" : "lg:order-1"}`}>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-dim">
            <span className="inline-flex items-center gap-2 text-white/80">
              <span className="size-2 rounded-full" style={{ background: accent }} />
              {host}
            </span>
            {site.year && <span>{site.year}</span>}
          </p>
          <h3 className="mt-3 text-[clamp(30px,3.3vw,52px)] font-semibold leading-[1] tracking-[-0.04em]">{site.name}</h3>
          {site.description && (
            <p className="mt-4 text-[15px] leading-[1.6] text-muted lg:line-clamp-6 lg:text-[16px]">{site.description}</p>
          )}
          {site.tags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {site.tags.map((t) => (
                <li key={t} className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/85">
                  {t}
                </li>
              ))}
            </ul>
          )}
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-7 inline-flex items-center gap-3 rounded-full bg-white py-2 pl-5 pr-2 text-[14px] font-medium text-ink transition-colors duration-300 hover:bg-lime"
          >
            Visit website
            <span className="grid size-9 place-items-center rounded-full bg-ink text-white transition-transform duration-500 ease-expo group-hover:rotate-45">
              <ArrowUpRight className="size-4" />
            </span>
          </a>
        </div>

        {/* Browser window */}
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="Visit"
          aria-label={`Open ${site.name} (${host}) in a new tab`}
          className={`group order-1 block overflow-hidden rounded-[18px] border border-white/10 bg-[#1a1a1a] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] ${flip ? "lg:order-1" : "lg:order-2"}`}
        >
          <div className="flex h-9 items-center gap-3 border-b border-white/[0.06] px-3.5 sm:h-10">
            <span className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-magenta" />
              <span className="size-2.5 rounded-full bg-lime" />
              <span className="size-2.5 rounded-full bg-blue" />
            </span>
            <span className="mx-auto flex min-w-0 max-w-[70%] items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/60 sm:text-[12px]">
              <svg viewBox="0 0 24 24" className="size-3 shrink-0" aria-hidden>
                <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <span className="truncate">{host}</span>
            </span>
            <span className="w-[42px]" aria-hidden />
          </div>
          <div className="relative aspect-[16/10] overflow-hidden bg-ink">
            {site.image ? (
              <Image
                {...imageProps(site.image.url)}
                alt={`${site.name} website`}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover object-top transition-transform duration-[1.4s] ease-expo group-hover:scale-[1.04]"
              />
            ) : (
              <div
                className="absolute inset-0 grid place-items-center"
                style={{ background: `radial-gradient(circle at 30% 20%, ${accent}55, transparent 60%), #111` }}
              >
                <span className="px-6 text-center text-[clamp(28px,4vw,64px)] font-semibold tracking-[-0.04em]">{site.name}</span>
              </div>
            )}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </div>
        </a>
      </div>
      <div data-site-shade className="pointer-events-none absolute inset-0 rounded-[28px] bg-black opacity-0" aria-hidden />
    </article>
  );
}
