"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lightbox, type LightboxItem } from "@/components/media/Lightbox";
import { ArrowUpRight } from "@/components/ui/Primitives";
import { mediaThumb, videoPoster, videoSrc } from "@/lib/media/urls";
import { lenisStore, openMessage } from "@/lib/store";
import { cn } from "@/lib/utils";
import { pinLabels, pinRatio, projectPins, type Pin } from "./pins";
import { hostOf } from "./WebsiteCard";
import { PinCard } from "./PinCard";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Close-up of one piece of work (Pinterest-style): the work large, its story,
 * and every other file from the same project underneath. Designs open full
 * screen, animations play, websites link out.
 */
export function PinView({
  pin,
  pins,
  sequence,
  onSelect,
  onClose,
}: {
  pin: Pin;
  pins: Pin[];
  /** The list the visitor is browsing, for previous / next. */
  sequence: Pin[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Everything from the same project (or every website), in order.
  const family = useMemo<Pin[]>(
    () => (pin.kind === "website" ? pins.filter((p) => p.kind === "website") : projectPins(pin.project)),
    [pin, pins],
  );
  const lightboxItems = useMemo<LightboxItem[]>(
    () =>
      family
        .filter((p) => p.media)
        .map((p) => ({ media: p.media!, title: p.title, subtitle: p.kind === "website" ? hostOf(p.site.url) : p.project.client })),
    [family],
  );
  const pos = sequence.findIndex((p) => p.id === pin.id);
  const prev = pos > 0 ? sequence[pos - 1] : null;
  const next = pos >= 0 && pos < sequence.length - 1 ? sequence[pos + 1] : null;

  // Freeze the page behind; Esc closes, arrow keys move between pieces.
  useEffect(() => {
    const lenis = lenisStore.get();
    lenis?.stop();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightbox !== null) return; // the full-screen viewer handles its own keys
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && next) onSelect(next.id);
      if (e.key === "ArrowLeft" && prev) onSelect(prev.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, next, prev, onClose, onSelect]);

  // Start at the top whenever another piece is shown.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pin.id]);

  const fullScreen = (id = pin.id) => {
    const i = family.filter((p) => p.media).findIndex((p) => p.id === id);
    if (i >= 0) setLightbox(i);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      ref={scroller}
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={pin.title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-ink"
    >
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/[0.06] bg-ink/85 px-3 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-full border border-line py-2 pl-3 pr-4 text-[13px] font-medium transition-colors hover:bg-white hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All work
        </button>
        <div className="flex items-center gap-1.5">
          {[
            { to: prev, label: "Previous", d: "M15 18l-6-6 6-6" },
            { to: next, label: "Next", d: "M9 6l6 6-6 6" },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              disabled={!b.to}
              onClick={() => b.to && onSelect(b.to.id)}
              aria-label={`${b.label} piece`}
              className="grid size-10 place-items-center rounded-full border border-line transition-colors hover:bg-white hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path d={b.d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-3 pb-[calc(96px+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pt-6">
        <motion.article
          key={pin.id}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="grid gap-4 rounded-[22px] border border-white/[0.06] bg-surface p-2.5 sm:rounded-[28px] sm:p-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)] lg:gap-8 lg:p-5"
        >
          <PinMedia pin={pin} onFullScreen={() => fullScreen()} />
          <PinInfo pin={pin} onFullScreen={() => fullScreen()} />
        </motion.article>

        <section className="mt-10 sm:mt-14" aria-labelledby="pin-family-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
            <h3 id="pin-family-title" className="text-[clamp(24px,3vw,36px)] font-semibold leading-[1.05] tracking-[-0.03em]">
              {pin.kind === "website" ? (
                <>
                  More <span className="serif-i font-normal">websites</span>
                </>
              ) : (
                <>
                  Everything from <span className="serif-i font-normal">{pin.project.client}</span>
                </>
              )}
            </h3>
            <p className="text-[13px] text-muted">
              {family.length} {family.length === 1 ? "piece" : "pieces"} · tap one to see it full screen
            </p>
          </div>
          <div className="columns-2 gap-2 sm:columns-3 sm:gap-3 lg:columns-4 lg:gap-4">
            {family.map((p, i) => (
              <PinCard
                key={p.id}
                pin={p}
                index={i}
                active={p.id === pin.id}
                onOpen={(id) => (p.kind === "website" ? onSelect(id) : fullScreen(id))}
              />
            ))}
          </div>
          {pin.kind !== "website" && (
            <Link
              href={`/work/${pin.project.slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-[14px] font-medium transition-colors hover:bg-white hover:text-ink"
            >
              Open the {pin.project.client} project page <ArrowUpRight className="size-4" />
            </Link>
          )}
        </section>
      </div>

      <Lightbox items={lightboxItems} index={lightbox} onClose={() => setLightbox(null)} />
    </motion.div>,
    document.body,
  );
}

/** The work itself, as large as the screen allows. */
function PinMedia({ pin, onFullScreen }: { pin: Pin; onFullScreen: () => void }) {
  const m = pin.media;
  const ratio = pinRatio(pin);

  if (m?.kind === "video") {
    return (
      <div className="relative overflow-hidden rounded-[16px] bg-black sm:rounded-[20px]">
        <video
          key={m.url}
          src={videoSrc(m, 1600)}
          poster={videoPoster(m, 1400)}
          controls
          autoPlay
          muted
          loop
          playsInline
          className="mx-auto block max-h-[78svh] w-full bg-black object-contain"
          style={{ aspectRatio: m.width && m.height ? m.width / m.height : 16 / 9 }}
        />
      </div>
    );
  }

  if (pin.kind === "website") {
    return (
      <div className="overflow-hidden rounded-[16px] border border-white/10 bg-[#1a1a1a] sm:rounded-[20px]">
        <div className="flex h-9 items-center gap-3 border-b border-white/[0.06] px-3.5 sm:h-10">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-magenta" />
            <span className="size-2.5 rounded-full bg-lime" />
            <span className="size-2.5 rounded-full bg-blue" />
          </span>
          <span className="mx-auto truncate rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/60 sm:text-[12px]">{hostOf(pin.site.url)}</span>
          <span className="w-[42px]" aria-hidden />
        </div>
        {m ? (
          <button type="button" onClick={onFullScreen} data-cursor="Expand" className="relative block w-full bg-ink" style={{ aspectRatio: ratio }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaThumb(m, 1800)} alt={`${pin.title} website`} className="absolute inset-0 size-full object-cover object-top" />
          </button>
        ) : (
          <div className="grid aspect-[16/10] place-items-center text-[28px] font-semibold">{pin.title}</div>
        )}
      </div>
    );
  }

  if (!m) return null;
  return (
    <button
      type="button"
      onClick={onFullScreen}
      data-cursor="Expand"
      aria-label={`View ${pin.title} full screen`}
      className={cn(
        "group relative grid w-full place-items-center overflow-hidden rounded-[16px] sm:rounded-[20px]",
        pin.kind === "logo" ? "bg-cream p-[10%]" : "bg-black/40",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={m.url}
        src={mediaThumb(m, 1800)}
        alt={pin.title}
        className="block max-h-[78svh] w-auto max-w-full object-contain"
        style={{ aspectRatio: m.width && m.height ? m.width / m.height : ratio }}
      />
      <span className="pointer-events-none absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

/** Title, story and the right action for the kind of work. */
function PinInfo({ pin, onFullScreen }: { pin: Pin; onFullScreen: () => void }) {
  const chip = pin.kind === "motion" && pin.asset.motionKind ? pin.asset.motionKind : pinLabels[pin.kind].one;

  if (pin.kind === "website") {
    const site = pin.site;
    return (
      <div className="flex flex-col px-2 pb-3 sm:px-3 lg:py-4">
        <span className="w-fit rounded-full bg-blue/25 px-3 py-1 text-[12px] font-medium">{chip}</span>
        <h2 className="mt-4 text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.02] tracking-[-0.04em]">{site.name}</h2>
        <p className="mt-2 text-[14px] text-muted">
          {hostOf(site.url)}
          {site.year ? ` · ${site.year}` : ""}
        </p>
        {site.description && <p className="mt-5 text-[15px] leading-[1.65] text-white/85">{site.description}</p>}
        {site.tags.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {site.tags.map((t) => (
              <li key={t} className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/85">
                {t}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-7 flex flex-wrap gap-2.5 lg:mt-auto lg:pt-8">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-full bg-lime py-2 pl-5 pr-2 text-[15px] font-semibold text-ink transition-colors hover:bg-white"
          >
            Visit website
            <span className="grid size-9 place-items-center rounded-full bg-ink text-lime transition-transform duration-500 ease-expo group-hover:rotate-45">
              <ArrowUpRight className="size-4" />
            </span>
          </a>
          <button
            type="button"
            onClick={() => openMessage(`A website like ${site.name}`)}
            className="rounded-full border border-white/20 px-5 py-3 text-[14px] font-medium transition-colors hover:bg-white hover:text-ink"
          >
            Get a site like this
          </button>
        </div>
      </div>
    );
  }

  const { project, asset } = pin;
  return (
    <div className="flex flex-col px-2 pb-3 sm:px-3 lg:py-4">
      <span className="w-fit rounded-full bg-lime/15 px-3 py-1 text-[12px] font-medium text-lime">{chip}</span>
      <h2 className="mt-4 text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.02] tracking-[-0.04em]">{pin.title}</h2>
      <p className="mt-2 text-[14px] text-muted">
        <span className="font-semibold text-white">{project.client}</span> · {project.category}
        {project.year ? ` · ${project.year}` : ""}
      </p>
      {asset.title && asset.title !== project.title && <p className="serif-i mt-4 text-[22px] leading-tight text-white/80">{project.title}</p>}
      {project.summary && <p className="mt-4 text-[15px] leading-[1.65] text-white/85">{project.summary}</p>}
      {project.services.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {project.services.map((s) => (
            <li key={s} className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/85">
              {s}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-7 flex flex-wrap gap-2.5 lg:mt-auto lg:pt-8">
        {pin.media.kind === "image" && (
          <button
            type="button"
            onClick={onFullScreen}
            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-white"
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            View full screen
          </button>
        )}
        <Link
          href={`/work/${project.slug}`}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-[14px] font-medium transition-colors hover:bg-white hover:text-ink"
        >
          Full project <ArrowUpRight className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => openMessage(`Something like ${project.client}`)}
          className="rounded-full px-4 py-3 text-[14px] font-medium text-white/80 transition-colors hover:text-white"
        >
          Ask about this
        </button>
      </div>
    </div>
  );
}

