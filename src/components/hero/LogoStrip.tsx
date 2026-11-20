"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Brand } from "@/lib/content/types";
import { imageProps } from "@/lib/media/urls";
import { gsap } from "@/lib/gsap";
import { lenisStore } from "@/lib/store";
import { cn, mod, prefersReducedMotion } from "@/lib/utils";

function Wordmark({ brand }: { brand: Brand }) {
  if (brand.logo) {
    const ratio = brand.logo.width && brand.logo.height ? brand.logo.width / brand.logo.height : 4;
    const h = ratio > 3 ? 28 : ratio > 1.6 ? 34 : 44;
    return (
      <Image
        {...imageProps(brand.logo.url)}
        alt={brand.name}
        width={Math.round(h * ratio)}
        height={h}
        sizes="240px"
        className="h-auto w-auto max-w-[180px] object-contain opacity-90 brightness-0 invert"
        style={{ height: h, width: "auto" }}
      />
    );
  }
  return (
    <span className="whitespace-nowrap font-logo text-[24px] font-extrabold leading-none tracking-[-0.03em] text-white">{brand.name}</span>
  );
}

/**
 * Infinite client strip. Cruises left; scroll velocity speeds it up and
 * scroll direction flips it — the strip "feels" the page.
 */
export function LogoStrip({ brands, className }: { brands: Brand[]; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current!;
    const set = track.firstElementChild as HTMLElement;
    const reduced = prefersReducedMotion();
    let x = 0;
    let dir = -1;
    let width = set.offsetWidth;
    const ro = new ResizeObserver(() => (width = set.offsetWidth));
    ro.observe(set);

    const tick = (_t: number, dtMs: number) => {
      if (reduced || !width) return;
      const v = lenisStore.get()?.velocity ?? 0;
      if (Math.abs(v) > 0.5) dir = v > 0 ? -1 : 1;
      const speed = 38 + Math.min(Math.abs(v) * 18, 900);
      x = mod(x + dir * speed * (dtMs / 1000), width) - width;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
    };
  }, []);

  const row = (key: string, hidden?: boolean) => (
    <ul key={key} className="flex shrink-0 items-center" aria-hidden={hidden}>
      {[...brands, ...brands].map((brand, i) => {
        const inner = <Wordmark brand={brand} />;
        return (
        <li key={`${brand.id}-${i}`} className="flex h-12 items-center px-8 sm:px-12">
          {brand.url && !hidden ? (
            <a href={brand.url} target="_blank" rel="noopener noreferrer" aria-label={brand.name}>
              {inner}
            </a>
          ) : (
            inner
          )}
        </li>
        );
      })}
    </ul>
  );

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-black/70 to-transparent" />
      <div ref={trackRef} className="flex w-max will-change-transform">
        {row("a")}
        {row("b", true)}
        {row("c", true)}
      </div>
    </div>
  );
}
