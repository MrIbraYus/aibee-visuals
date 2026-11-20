"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Media } from "@/lib/content/types";
import { imageProps, videoPoster, videoSrc } from "@/lib/media/urls";
import { lenisStore } from "@/lib/store";

export type LightboxItem = { media: Media; title?: string; subtitle?: string };

/**
 * Full-screen viewer for images and videos.
 * Arrow keys / swipe to move, Esc or the close button to exit.
 */
export function Lightbox({ items, index, onClose }: { items: LightboxItem[]; index: number | null; onClose: () => void }) {
  const [current, setCurrent] = useState(index ?? 0);
  const [dir, setDir] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const open = index !== null;

  // Jump to the requested item whenever the viewer is (re)opened.
  const [prevIndex, setPrevIndex] = useState(index);
  if (index !== prevIndex) {
    setPrevIndex(index);
    if (index !== null) setCurrent(index);
  }

  const step = useCallback(
    (d: number) => {
      if (items.length < 2) return;
      setDir(d);
      setCurrent((c) => (c + d + items.length) % items.length);
    },
    [items.length],
  );

  useEffect(() => {
    if (!open) return;
    const lenis = lenisStore.get();
    lenis?.stop();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [open, onClose, step]);

  if (typeof document === "undefined") return null;
  const item = items[current];

  return createPortal(
    <AnimatePresence>
      {open && item && (
        <motion.div
          className="fixed inset-0 z-[95] flex flex-col bg-black/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={item.title ?? "Viewer"}
          onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            if (!start.current) return;
            const dx = e.clientX - start.current.x;
            const dy = e.clientY - start.current.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
            else if (dy > 120 && Math.abs(dy) > Math.abs(dx)) onClose();
            start.current = null;
          }}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              {item.title && <p className="truncate text-[15px] font-medium text-white">{item.title}</p>}
              {item.subtitle && <p className="truncate text-[12px] text-white/55">{item.subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {items.length > 1 && (
                <span className="text-[13px] tabular-nums text-white/55">
                  {current + 1} / {items.length}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 px-2 pb-4 sm:px-16 sm:pb-8">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div
                key={current}
                custom={dir}
                className="absolute inset-0 flex items-center justify-center px-2 pb-4 sm:px-16 sm:pb-8"
                initial={{ opacity: 0, x: dir * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -60 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {item.media.kind === "video" ? (
                  <video
                    key={item.media.url}
                    src={videoSrc(item.media, 1920)}
                    poster={videoPoster(item.media, 1600)}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-full max-w-full rounded-xl bg-black"
                  />
                ) : (
                  <div className="relative size-full">
                    <Image
                      {...imageProps(item.media.url)}
                      alt={item.title ?? ""}
                      fill
                      sizes="100vw"
                      className="object-contain"
                      draggable={false}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous"
                  className="absolute left-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white hover:text-ink sm:grid"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next"
                  className="absolute right-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white hover:text-ink sm:grid"
                >
                  →
                </button>
              </>
            )}
          </div>
          {items.length > 1 && <p className="pb-4 text-center text-[12px] text-white/40 sm:hidden">Swipe to browse · swipe down to close</p>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
