"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Project } from "@/lib/content/types";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { lenisStore, openMessage, scrollToTarget } from "@/lib/store";
import { ArrowUpRight, PillButton } from "@/components/ui/Primitives";
import { ProjectCover } from "@/components/work/ProjectCover";
import { cn, prefersReducedMotion } from "@/lib/utils";
import { useRail } from "@/lib/useRail";
import { RailProgress } from "@/components/ui/RailProgress";

const ease = [0.16, 1, 0.3, 1] as const;

/** Grid placement per tile, mirroring the Figma bento (desktop). Below desktop the tiles form a swipeable row. */
const layout = [
  "lg:col-start-1 lg:row-span-2",
  "lg:col-start-2 lg:row-start-1",
  "lg:col-start-2 lg:row-start-2",
  "lg:col-start-3 lg:row-span-2 lg:row-start-1",
  "lg:col-start-4 lg:row-span-2 lg:row-start-1",
];

function Tile({ project, index, onOpen }: { project: Project; index: number; onOpen: (slug: string) => void }) {
  return (
    <motion.button
      type="button"
      data-work-tile
      onClick={() => onOpen(project.slug)}
      data-cursor="View"
      className={cn(
        "group relative block aspect-[4/5] w-[78vw] shrink-0 snap-start overflow-hidden rounded-[18px] bg-surface text-left outline-offset-4 sm:w-[44vw] lg:aspect-auto lg:w-full lg:shrink",
        layout[index],
      )}
      aria-label={`Open ${project.client}: ${project.title}`}
    >
      <motion.div layoutId={`media-${project.slug}`} className="absolute inset-0 overflow-hidden rounded-[18px]">
        <div data-parallax className="absolute inset-[-8%] transition-[scale] duration-[1.2s] ease-expo group-hover:scale-[1.06]">
          <ProjectCover project={project} sizes="(max-width: 1024px) 100vw, 35vw" />
        </div>
      </motion.div>
      <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-b from-black/45 via-transparent to-black/70 opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/35 py-1.5 pl-2 pr-3 text-[12px] backdrop-blur-md">
        <span className="size-2 rounded-full bg-lime" />
        <span className="font-semibold">{project.client}</span>
        <span className="serif-i text-[14px] text-white/80">{project.category}</span>
      </div>
      <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 transition-all duration-500 ease-expo lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-visible:translate-y-0 lg:group-focus-visible:opacity-100">
        <p className="serif-i text-[clamp(22px,2vw,30px)] leading-[1] text-white">{project.title}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime text-ink">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </motion.button>
  );
}

function QuickView({ project, onClose }: { project: Project; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const lenis = lenisStore.get();
    lenis?.stop();
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center p-2 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-title"
    >
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <div className="relative grid max-h-[94svh] w-full max-w-[1200px] overflow-hidden rounded-[24px] border border-line bg-surface lg:grid-cols-[1.15fr_1fr]">
        <motion.div
          layoutId={`media-${project.slug}`}
          className="relative aspect-[4/5] max-h-[52svh] overflow-hidden lg:aspect-auto lg:max-h-none lg:min-h-[640px]"
        >
          <ProjectCover project={project} sizes="(max-width: 1024px) 100vw, 60vw" />
        </motion.div>
        <motion.div
          className="flex flex-col overflow-y-auto p-6 sm:p-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.25, duration: 0.7, ease } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-[14px] text-muted">
              <span className="font-semibold text-white">{project.client}</span> · {project.category} · {project.year}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-white transition-colors hover:bg-white hover:text-ink"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <h3 id="case-title" className="serif-i mt-8 text-[clamp(40px,4.6vw,68px)] leading-[0.98] tracking-[-0.03em]">
            {project.title}
          </h3>
          <p className="mt-6 text-[16px] leading-[1.6] text-muted">{project.summary}</p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {project.services.map((s) => (
              <li key={s} className="rounded-full border border-line px-4 py-2 text-[13px] text-white/90">
                {s}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap items-center gap-4 pt-10">
            <Link
              href={`/work/${project.slug}`}
              className="group inline-flex items-center gap-3 rounded-full border border-white/30 px-6 py-4 text-sm font-medium transition-colors hover:bg-white hover:text-ink"
            >
              Open full project
              <ArrowUpRight className="transition-transform duration-500 group-hover:rotate-45" />
            </Link>
            <PillButton
              onClick={() => {
                onClose();
                openMessage(`A project like ${project.client}`);
              }}
            >
              Ask about a similar project
            </PillButton>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/** Selected work — bento grid on desktop, a swipeable row on phones and tablets, with an expanding quick view. */
export function Work({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const { progress, scrollable } = useRail(rail);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const selected = projects.find((p) => p.slug === openSlug) ?? null;
  const close = useCallback(() => setOpenSlug(null), []);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(ref);
      const split = SplitText.create(q("[data-work-heading]"), { type: "lines,words", mask: "lines" });
      gsap
        .timeline({ scrollTrigger: { trigger: ref.current, start: "top 70%" } })
        .from(split.words, { yPercent: 110, stagger: 0.04, duration: 1.1 }, 0)
        .from(q("[data-work-link]"), { autoAlpha: 0, x: 30, duration: 1 }, 0.3);

      gsap.fromTo(
        q("[data-work-tile]"),
        { clipPath: "inset(100% 0% 0% 0% round 18px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 18px)",
          duration: 1.5,
          ease: "expo.inOut",
          stagger: 0.12,
          scrollTrigger: { trigger: q("[data-work-grid]"), start: "top 80%" },
        },
      );

      q("[data-parallax]").forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
    },
    { scope: ref },
  );

  return (
    <section id="work" ref={ref} className="relative z-10 bg-ink">
      <div className="frame py-[clamp(72px,8vw,120px)]">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <h2
            data-work-heading
            className="max-w-[13ch] text-[clamp(36px,3.9vw,56px)] font-semibold leading-[1.02] tracking-[-0.04em]"
          >
            A few things we&apos;ve brought to life.
          </h2>
          <div data-work-link className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="button"
              onClick={() => scrollToTarget("#websites", -20)}
              className="group flex items-center gap-2 text-[14px] font-medium text-white/80 transition-colors hover:text-white"
            >
              <span className="relative">
                Websites we&apos;ve built
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-white/70 transition-transform duration-500 ease-expo group-hover:origin-left group-hover:scale-x-100" />
              </span>
              <svg viewBox="0 0 24 24" className="size-4 transition-transform duration-500 ease-expo group-hover:translate-y-0.5" aria-hidden>
                <path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Link href="/work" className="group flex items-center gap-2 text-[14px] font-medium text-lime">
              <span className="relative">
                Explore all work
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-lime transition-transform duration-500 ease-expo group-hover:origin-left group-hover:scale-x-100" />
              </span>
              <ArrowUpRight className="size-4 transition-transform duration-500 ease-expo group-hover:rotate-45" />
            </Link>
          </div>
        </div>

        <div
          ref={rail}
          data-work-grid
          className="-mx-[var(--gutter)] mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[var(--gutter)] scroll-px-[var(--gutter)] [scrollbar-width:none] lg:mx-0 lg:mt-14 lg:grid lg:h-[clamp(480px,42vw,640px)] lg:snap-none lg:grid-cols-[1.75fr_1.55fr_1fr_0.95fr] lg:grid-rows-2 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {projects.map((project, i) => (
            <Tile key={project.slug} project={project} index={i} onOpen={setOpenSlug} />
          ))}
        </div>
        {scrollable && <RailProgress progress={progress} className="mt-6 lg:hidden" />}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>{selected && <QuickView key={selected.slug} project={selected} onClose={close} />}</AnimatePresence>,
          document.body,
        )}
    </section>
  );
}
