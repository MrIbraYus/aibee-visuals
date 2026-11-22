"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { mediaThumb, videoSrc } from "@/lib/media/urls";
import { cn, isFinePointer } from "@/lib/utils";
import { ArrowUpRight } from "@/components/ui/Primitives";
import { pinLabels, pinRatio, type Pin } from "./pins";
import { hostOf } from "./WebsiteCard";

const ease = [0.16, 1, 0.3, 1] as const;

/** One card: shaped like the work itself (portrait, landscape or square). */
export function PinCard({
  pin,
  index,
  onOpen,
  compact,
  active,
  className,
}: {
  pin: Pin;
  index: number;
  onOpen: (id: string) => void;
  compact?: boolean;
  active?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const isVideo = pin.media?.kind === "video";
  const isLogo = pin.kind === "logo";

  // Animations play silently while they're on screen, like a Pinterest feed
  // (not for visitors who asked for less motion or are saving data).
  useEffect(() => {
    const el = box.current;
    if (!isVideo || !el) return;
    const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [isVideo]);
  const playing = isVideo && (hover || inView);
  const label = pin.kind === "motion" && pin.asset.motionKind ? pin.asset.motionKind : pinLabels[pin.kind].one;
  const sub = pin.kind === "website" ? hostOf(pin.site.url) : pin.project.client;

  return (
    <motion.figure
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "40px" }}
      transition={{ duration: 0.7, ease, delay: Math.min(index % 6, 5) * 0.04 }}
      className={cn("group mb-2 break-inside-avoid sm:mb-3", className)}
    >
      <div
        ref={box}
        className={cn(
          "relative overflow-hidden rounded-[14px] sm:rounded-[18px]",
          isLogo ? "bg-cream" : "bg-surface",
          active && "ring-2 ring-lime ring-offset-2 ring-offset-ink",
        )}
        style={{ aspectRatio: pinRatio(pin) }}
        onPointerEnter={(e) => e.pointerType === "mouse" && isFinePointer() && setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        {pin.media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaThumb(pin.media, 640)}
            alt={`${pin.title}${pin.kind === "website" ? " website" : ` — ${sub}`}`}
            loading={index < 8 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            className={cn(
              "absolute inset-0 size-full transition-transform duration-700 ease-expo group-hover:scale-[1.04]",
              isLogo ? "object-contain p-[14%]" : pin.kind === "website" ? "object-cover object-top" : "object-cover",
            )}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(183,245,0,0.25),transparent_60%)] p-4 text-center text-[18px] font-semibold">
            {pin.title}
          </div>
        )}
        {playing && pin.media && (
          <video
            src={videoSrc(pin.media, 640)}
            poster={mediaThumb(pin.media, 640)}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 size-full object-cover"
            aria-hidden
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Type badge: always on videos and websites, on hover for the rest */}
        <span
          className={cn(
            "pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md transition-opacity duration-300 sm:left-3 sm:top-3 sm:text-[11px]",
            isVideo || pin.kind === "website" ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {isVideo && (
            <svg viewBox="0 0 24 24" className="size-2.5" aria-hidden>
              <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
            </svg>
          )}
          {label}
        </span>

        <button
          type="button"
          onClick={() => onOpen(pin.id)}
          data-cursor={isVideo ? "Play" : "View"}
          aria-label={`Open ${pin.title}`}
          className="absolute inset-0 z-[1] rounded-[inherit] outline-offset-2"
        />

        {pin.kind === "website" && (
          <a
            href={pin.site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 z-[2] inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink shadow-lg transition-colors hover:bg-lime sm:bottom-3 sm:right-3 sm:px-3 sm:text-[12px]"
          >
            Visit <ArrowUpRight className="size-3" />
          </a>
        )}
      </div>
      {!compact && (
        <figcaption className="mt-1.5 px-0.5 sm:mt-2">
          <p className="truncate text-[12px] font-semibold leading-tight sm:text-[13px]">{pin.title}</p>
          <p className="hidden truncate text-[12px] text-muted sm:block">{sub}</p>
        </figcaption>
      )}
    </motion.figure>
  );
}
