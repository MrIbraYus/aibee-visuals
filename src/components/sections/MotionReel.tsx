"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { motionKinds, type MotionItem, type MotionKind } from "@/lib/content/types";
import { videoPoster, videoSrc } from "@/lib/media/urls";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { cn, prefersReducedMotion } from "@/lib/utils";
import { ArrowUpRight } from "@/components/ui/Primitives";
import { Lightbox } from "@/components/media/Lightbox";
import { VideoCard } from "@/components/media/VideoCard";

const kindOf = (i: MotionItem) => (i.asset.motionKind ?? "Motion graphics") as MotionKind;

/**
 * Motion — a blue "screening room": the featured reel plays on a big
 * screen, the rest of the motion work rolls underneath.
 */
export function MotionReel({ items }: { items: MotionItem[] }) {
  const ref = useRef<HTMLElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const [kind, setKind] = useState<MotionKind | "All">("All");
  const [open, setOpen] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);

  const ordered = useMemo(() => [...items.filter((i) => i.asset.reel), ...items.filter((i) => !i.asset.reel)], [items]);
  const kinds = motionKinds.filter((k) => items.some((i) => kindOf(i) === k));
  const shown = kind === "All" ? ordered : ordered.filter((i) => kindOf(i) === kind);
  const featured = shown[0];
  const rest = shown.slice(1);
  const lightboxItems = shown.map((i) => ({ media: i.asset.media, title: i.asset.title, subtitle: `${i.project.client} · ${kindOf(i)}` }));

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(ref);
      const split = SplitText.create(q("[data-mr-title]"), { type: "chars", mask: "chars" });
      split.masks.forEach((m) => {
        (m as HTMLElement).style.paddingBottom = "0.2em";
        (m as HTMLElement).style.marginBottom = "-0.2em";
      });
      gsap.from(split.chars, { yPercent: 110, stagger: 0.03, duration: 1.2, scrollTrigger: { trigger: ref.current, start: "top 70%" } });
      gsap.fromTo(
        q("[data-mr-screen]"),
        { scale: 0.86, borderRadius: 48 },
        { scale: 1, borderRadius: 20, ease: "none", scrollTrigger: { trigger: q("[data-mr-screen]")[0], start: "top bottom", end: "top 30%", scrub: true } },
      );
    },
    { scope: ref },
  );

  if (!items.length) return null;

  return (
    <section id="motion" ref={ref} aria-labelledby="motion-title" className="relative z-10 overflow-hidden bg-blue text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="frame relative py-[clamp(72px,9vw,128px)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="motion-title" className="text-[clamp(52px,9vw,148px)] font-semibold leading-[0.88] tracking-[-0.055em]">
            <span data-mr-title className="block">
              Things
            </span>
            <span className="serif-i block font-normal tracking-[-0.03em]">that move.</span>
          </h2>
          <div className="flex flex-col gap-4 lg:items-end">
            <p className="max-w-[38ch] text-[16px] leading-[1.5] text-white/80 lg:text-right">
              Logo animations, motion graphics and video — brands are remembered for how they move, too.
            </p>
            {kinds.length > 1 && (
              <div className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:px-0" role="tablist" aria-label="Filter motion">
                {(["All", ...kinds] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={kind === k}
                    onClick={() => setKind(k)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-[14px] transition-colors",
                      kind === k ? "border-white bg-white text-blue" : "border-white/35 text-white hover:border-white",
                    )}
                  >
                    {k === "All" ? "All" : `${k}s`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {featured && (
          <div className="mt-10 lg:mt-14">
            <div data-mr-screen className="relative aspect-video overflow-hidden rounded-[20px] bg-black shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
              <video
                key={featured.asset.id}
                ref={screenRef}
                src={videoSrc(featured.asset.media, 1920)}
                poster={videoPoster(featured.asset.media, 1600)}
                autoPlay
                muted={muted}
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 size-full object-contain"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/75 to-transparent p-4 sm:p-6">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold sm:text-[18px]">{featured.asset.title}</p>
                  <p className="text-[13px] text-white/70">
                    {featured.project.client} · {kindOf(featured)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    aria-label={muted ? "Turn sound on" : "Mute"}
                    className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur-md transition-colors hover:bg-white hover:text-ink"
                  >
                    {muted ? (
                      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                        <path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                        <path d="M4 9h4l5-4v14l-5-4H4zM17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(0)}
                    aria-label="Watch full screen"
                    className="grid size-11 place-items-center rounded-full bg-white text-ink transition-transform hover:scale-105"
                  >
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <div className="no-scrollbar -mx-[var(--gutter)] mt-4 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-4 overflow-x-auto px-[var(--gutter)] pb-2 sm:mt-6">
            {rest.map((item, i) => (
              <figure key={item.asset.id} className="w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[30%]">
                <VideoCard media={item.asset.media} onOpen={() => setOpen(i + 1)} label={item.asset.title} className="aspect-video rounded-2xl" width={960} />
                <figcaption className="mt-3 flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">{item.asset.title}</span>
                    <span className="block text-[13px] text-white/65">{item.project.client}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-white/30 px-2.5 py-1 text-[12px]">{kindOf(item)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <Link href="/motion" className="group mt-10 inline-flex items-center gap-3 rounded-full bg-white px-6 py-4 text-[14px] font-medium text-blue transition-transform hover:scale-[1.03]">
          See all motion work
          <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:rotate-45" />
        </Link>
      </div>

      <Lightbox items={lightboxItems} index={open} onClose={() => setOpen(null)} />
    </section>
  );
}
