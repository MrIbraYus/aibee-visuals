"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Project } from "@/lib/content/types";
import { gsap, useGSAP } from "@/lib/gsap";
import { openMessage } from "@/lib/store";
import { ProjectCover } from "@/components/work/ProjectCover";
import { ArrowUpRight } from "@/components/ui/Primitives";

/**
 * Horizontal gallery. On desktop the section pins and the strip of work
 * travels sideways as you scroll; on touch screens it's a native swipe row.
 */
export function Gallery({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const section = ref.current!;
        const track = trackRef.current!;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

        const travel = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        gsap.utils.toArray<HTMLElement>("[data-g-card]", section).forEach((card, i) => {
          const media = card.querySelector("[data-g-media]");
          if (media) gsap.fromTo(
            media,
            { scale: 1.25, xPercent: 8 },
            {
              scale: 1,
              xPercent: -8,
              ease: "none",
              scrollTrigger: { trigger: card, containerAnimation: travel, start: "left right", end: "right left", scrub: true },
            },
          );
          gsap.fromTo(
            card,
            { rotate: i % 2 ? 3 : -3, y: i % 2 ? 40 : -20 },
            {
              rotate: 0,
              y: 0,
              ease: "none",
              scrollTrigger: { trigger: card, containerAnimation: travel, start: "left right", end: "center center", scrub: true },
            },
          );
        });

        gsap.to("[data-g-progress]", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top top", end: () => `+=${distance()}`, scrub: true },
        });

      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-labelledby="gallery-title" className="relative z-10 overflow-hidden bg-lime text-ink">
      <div className="flex flex-col justify-center py-[clamp(72px,9vw,120px)] lg:min-h-svh lg:py-0">
        <div
          ref={trackRef}
          className="no-scrollbar flex snap-x snap-mandatory scroll-px-[var(--gutter)] items-center gap-5 overflow-x-auto px-[var(--gutter)] will-change-transform lg:w-max lg:snap-none lg:gap-8 lg:overflow-visible"
        >
          {/* Intro panel */}
          <div className="flex w-[82vw] shrink-0 snap-start flex-col justify-center sm:w-[60vw] lg:w-[38vw] lg:pr-10">
            <h2 id="gallery-title" className="text-[clamp(44px,6vw,104px)] font-semibold leading-[0.95] tracking-[-0.05em]">
              Every brief, <span className="serif-i font-normal tracking-[-0.03em]">a new world.</span>
            </h2>
            <p className="mt-6 max-w-[34ch] text-[17px] leading-[1.5] text-ink/75">
              Campaigns, identities and content systems — a closer look at the craft behind the work.
            </p>
            <Link
              href="/work"
              className="group mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-ink px-6 py-4 text-[14px] font-medium text-white transition-transform duration-500 ease-expo hover:scale-[1.03]"
            >
              Browse the full archive
              <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:rotate-45" />
            </Link>
          </div>

          {projects.map((project, i) => (
            <Link
              key={project.slug}
              href={`/work/${project.slug}`}
              data-g-card
              data-cursor="Open"
              data-cursor-color="#080808"
              className="group block w-[72vw] shrink-0 snap-start sm:w-[44vw] lg:w-[clamp(300px,25vw,420px)]"
              style={{ marginTop: i % 2 ? "6vh" : 0 }}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-ink/10 shadow-[0_30px_60px_-30px_rgba(8,8,8,0.5)]">
                <div data-g-media className="absolute inset-0 transition-[scale] duration-700 ease-expo group-hover:scale-[1.04]">
                  <ProjectCover project={project} sizes="(max-width: 1024px) 72vw, 26vw" />
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] font-semibold leading-tight">{project.client}</p>
                  <p className="serif-i mt-0.5 text-[20px] leading-tight text-ink/70">{project.title}</p>
                </div>
                <span className="shrink-0 rounded-full border border-ink/25 px-3 py-1 text-[12px]">{project.category}</span>
              </div>
            </Link>
          ))}

          {/* Closing card */}
          <button
            type="button"
            onClick={() => openMessage()}
            data-g-card
            className="group flex aspect-[4/5] w-[72vw] shrink-0 snap-start flex-col justify-between rounded-[22px] bg-ink p-7 text-left text-white sm:w-[44vw] lg:w-[clamp(300px,25vw,420px)]"
          >
            <span className="grid size-14 place-items-center rounded-full bg-lime text-ink transition-transform duration-500 ease-expo group-hover:rotate-45">
              <ArrowUpRight className="size-6" />
            </span>
            <span className="text-[clamp(34px,3vw,48px)] font-semibold leading-[1] tracking-[-0.04em]">
              Your brand <span className="serif-i font-normal">could be next.</span>
            </span>
          </button>
          <div className="w-[var(--gutter)] shrink-0 lg:w-[6vw]" aria-hidden />
        </div>

        <div className="frame mt-10 hidden lg:block" aria-hidden>
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-ink/15">
            <div data-g-progress className="h-full origin-left bg-ink" style={{ transform: "scaleX(0)" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
