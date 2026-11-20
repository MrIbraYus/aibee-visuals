"use client";

import { useEffect, useRef, useState } from "react";
import type { Media } from "@/lib/content/types";
import { videoPoster, videoSrc } from "@/lib/media/urls";
import { cn, isFinePointer } from "@/lib/utils";

/**
 * A video thumbnail: plays silently on hover (desktop) or when it scrolls
 * into view (`autoPlay`), and opens the viewer when clicked.
 */
export function VideoCard({
  media,
  onOpen,
  autoPlay,
  className,
  label,
  width = 1280,
}: {
  media: Media;
  onOpen?: () => void;
  autoPlay?: boolean;
  className?: string;
  label?: string;
  width?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const video = ref.current!;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [autoPlay]);

  const hoverPlay = () => {
    if (!autoPlay && isFinePointer()) ref.current?.play().catch(() => {});
  };
  const hoverStop = () => {
    if (!autoPlay && isFinePointer() && ref.current) {
      ref.current.pause();
    }
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={hoverPlay}
      onPointerLeave={hoverStop}
      aria-label={label ? `Play ${label}` : "Play video"}
      data-cursor="Play"
      className={cn("group relative block w-full overflow-hidden bg-black text-left", className)}
    >
      <video
        ref={ref}
        src={videoSrc(media, width)}
        poster={videoPoster(media, Math.min(width, 1200))}
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.03]"
      />
      <span
        className={cn(
          "absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-xl transition-all duration-500 ease-expo",
          playing ? "scale-75 opacity-0" : "scale-100 opacity-100 group-hover:scale-110",
        )}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="ml-0.5 size-5" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    </button>
  );
}
