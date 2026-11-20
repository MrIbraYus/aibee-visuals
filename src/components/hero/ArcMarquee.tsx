"use client";

import Image from "next/image";
import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from "react";
import { gsap } from "@/lib/gsap";
import { useIntroDone } from "@/lib/store";
import { imageProps } from "@/lib/media/urls";
import { clamp, cn, mod, prefersReducedMotion } from "@/lib/utils";

/** Geometry of a card in marquee-root coordinates (the root fills the hero). */
export type CardGeometry = { cx: number; cy: number; w: number; h: number; rot: number };

export type ArcItem = { src: string; alt: string };

export type ArcMarqueeHandle = {
  closestToCenter(): number;
  geometry(slot: number): CardGeometry;
  exhibitIndex(slot: number): number;
  /** Ease the conveyor to a stop (true) or back to cruising speed. */
  setPaused(paused: boolean): void;
  /** Hide the card that is being "zoomed" (its clone takes over). -1 clears. */
  setFocus(slot: number): void;
  /** Camera push: scale the whole arc around a point. */
  setZoom(scale: number, originX: number, originY: number): void;
};

type Props = {
  items: ArcItem[];
  /** Element the arc sits under (the service pills). */
  anchorRef: RefObject<HTMLElement | null>;
  onCardClick?: (slot: number) => void;
  className?: string;
};

/** Number of cards on the conveyor (a multiple of the 5 exhibits). */
const SLOTS = 15;
/** Cruising speed in px/s at a 1440px wide viewport. */
const SPEED = 52;
/** Card aspect (Figma: 266 × 351). */
const RATIO = 1.32;

function offsetWithin(el: HTMLElement, ancestor: HTMLElement) {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

export const ArcMarquee = forwardRef<ArcMarqueeHandle, Props>(function ArcMarquee(
  { items, anchorRef, onCardClick, className },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const clickRef = useRef(onCardClick);
  const introDone = useIntroDone();

  useEffect(() => {
    clickRef.current = onCardClick;
  }, [onCardClick]);

  const sim = useRef({
    offset: 0,
    pause: 1, // 0..1, multiplied into speed
    hoverSlow: 1,
    vel: 0,
    dragging: false,
    hover: -1,
    focus: -1,
    active: true,
    lift: new Float32Array(SLOTS),
    z: new Int16Array(SLOTS).fill(-1),
    vis: new Int8Array(SLOTS).fill(-1),
    L: { vw: 1440, vh: 900, w: 266, h: 351, sp: 248, arcH: 200, centerY: 700, total: 248 * SLOTS, speed: SPEED },
    geo: Array.from({ length: SLOTS }, () => ({ cx: 0, cy: 0, w: 0, h: 0, rot: 0 }) as CardGeometry),
  });

  useImperativeHandle(
    ref,
    () => ({
      closestToCenter() {
        const s = sim.current;
        let best = 0;
        let bestD = Infinity;
        s.geo.forEach((g, i) => {
          const d = Math.abs(g.cx - s.L.vw / 2);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        return best;
      },
      geometry: (slot) => sim.current.geo[slot],
      exhibitIndex: (slot) => slot % items.length,
      setPaused(paused) {
        gsap.to(sim.current, {
          pause: paused ? 0 : 1,
          duration: paused ? 0.45 : 1.4,
          ease: paused ? "power2.out" : "power2.inOut",
          overwrite: true,
        });
      },
      setFocus(slot) {
        sim.current.focus = slot;
        if (slot >= 0) sim.current.hover = -1;
        cardRefs.current.forEach((el, i) => {
          if (el) el.style.opacity = i === slot ? "0" : "";
        });
      },
      setZoom(scale, originX, originY) {
        const stage = stageRef.current;
        if (!stage) return;
        if (scale <= 1.0001) {
          stage.style.transform = "";
          return;
        }
        stage.style.transformOrigin = `${originX}px ${originY}px`;
        stage.style.transform = `scale(${scale})`;
      },
    }),
    [items.length],
  );

  // Layout + per-frame simulation
  useEffect(() => {
    const root = rootRef.current!;
    const s = sim.current;
    const reduced = prefersReducedMotion();

    const measure = () => {
      const vw = root.clientWidth;
      const vh = root.clientHeight;
      const mobile = vw < 768;
      const anchor = anchorRef.current;
      const anchorBottom = anchor ? offsetWithin(anchor, root.parentElement!) + anchor.offsetHeight : vh * 0.62;
      const gap = clamp(vh * 0.06, 28, 72);
      const top = anchorBottom + gap;

      let w = mobile ? clamp(vw * 0.44, 150, 240) : clamp(vw * 0.2, 200, 380);
      // Keep at least ~70% of the centre card above the fold.
      const fit = (vh - top) / (RATIO * 0.7);
      w = clamp(Math.min(w, fit), mobile ? 132 : 170, 380);
      const h = w * RATIO;
      const sp = w * (mobile ? 0.97 : 0.93);
      s.L = {
        vw,
        vh,
        w,
        h,
        sp,
        arcH: mobile ? vw * 0.16 : clamp(vw * 0.09, 70, 210),
        centerY: top + h / 2,
        total: sp * SLOTS,
        speed: SPEED * clamp(vw / 1440, 0.55, 1.5) * (reduced ? 0 : 1),
      };
      cardRefs.current.forEach((el) => {
        if (!el) return;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      });
    };

    const tick = (_time: number, deltaMs: number) => {
      if (!s.active) return;
      const { vw, w, h, sp, arcH, centerY, total, speed } = s.L;
      const dt = Math.min(deltaMs, 50) / 1000;
      if (!s.dragging) {
        s.offset += (speed * s.pause * s.hoverSlow + s.vel) * dt;
        s.vel *= Math.pow(0.035, dt);
      }
      const half = vw / 2;
      for (let i = 0; i < SLOTS; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const pos = mod(i * sp - s.offset, total);
        const cx = pos - sp * 1.5;
        const u = (cx - half) / half;
        const uc = clamp(u, -1.9, 1.9);

        const want = s.hover === i && s.focus < 0 ? 1 : 0;
        s.lift[i] += (want - s.lift[i]) * Math.min(1, dt * 9);
        const lift = s.lift[i];

        // Smoothed "V": flat-ish in the middle, rising toward the edges (Figma arc).
        const rise = arcH * (Math.sqrt(uc * uc + 0.04) - 0.2);
        const cy = centerY - rise - lift * 22;
        const rot = clamp(12.4 * u, -26, 26) * (1 - lift * 0.55);
        const g = s.geo[i];
        g.cx = cx;
        g.cy = cy;
        g.w = w;
        g.h = h;
        g.rot = rot;

        const visible = cx + w > -w * 0.6 && cx - w < vw + w * 0.6 ? 1 : 0;
        if (visible !== s.vis[i]) {
          el.style.visibility = visible ? "" : "hidden";
          s.vis[i] = visible;
        }
        if (!visible) continue;
        el.style.transform = `translate3d(${(cx - w / 2).toFixed(2)}px, ${(cy - h / 2).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${1 + lift * 0.05})`;
        const z = Math.floor(pos / sp) + (lift > 0.05 ? 40 : 0);
        if (z !== s.z[i]) {
          el.style.zIndex = String(z);
          s.z[i] = z;
        }
      }
    };

    measure();
    tick(0, 16);
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    if (anchorRef.current) ro.observe(anchorRef.current);
    const io = new IntersectionObserver(([entry]) => (s.active = entry.isIntersecting), { rootMargin: "100px" });
    io.observe(root);
    gsap.ticker.add(tick);

    // Drag / throw
    let lastX = 0;
    let lastT = 0;
    let moved = 0;
    let downSlot = -1;
    let pointerId = -1;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || s.focus >= 0) return;
      const card = (e.target as HTMLElement).closest<HTMLElement>("[data-slot]");
      if (!card) return;
      downSlot = Number(card.dataset.slot);
      pointerId = e.pointerId;
      s.dragging = true;
      s.vel = 0;
      moved = 0;
      lastX = e.clientX;
      lastT = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      if (!s.dragging || e.pointerId !== pointerId) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dtm = Math.max(1, now - lastT);
      moved += Math.abs(dx);
      if (moved > 6 && !root.hasPointerCapture(pointerId)) {
        try {
          root.setPointerCapture(pointerId);
        } catch {}
      }
      s.offset -= dx;
      s.vel = clamp(s.vel * 0.6 + (-dx / dtm) * 1000 * 0.4, -3000, 3000);
      lastX = e.clientX;
      lastT = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!s.dragging || e.pointerId !== pointerId) return;
      s.dragging = false;
      if (root.hasPointerCapture(pointerId)) root.releasePointerCapture(pointerId);
      if (performance.now() - lastT > 80) s.vel = 0;
      if (moved < 6 && downSlot >= 0) clickRef.current?.(downSlot);
      downSlot = -1;
    };
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [anchorRef]);

  // Cards rise into the arc after the intro.
  useEffect(() => {
    if (!introDone) return;
    const inners = cardRefs.current.map((el) => el?.firstElementChild).filter(Boolean) as HTMLElement[];
    const ctx = gsap.context(() => {
      gsap.fromTo(
        inners,
        { yPercent: 120, rotate: (i) => (i % 2 ? 10 : -10) },
        { yPercent: 0, rotate: 0, duration: 1.6, ease: "expo.out", stagger: { each: 0.06, from: "center" }, delay: 0.5 },
      );
    });
    return () => ctx.revert();
  }, [introDone]);

  const setHover = (slot: number) => {
    const s = sim.current;
    if (s.focus >= 0) return;
    s.hover = slot;
    gsap.to(s, { hoverSlow: slot >= 0 ? 0.18 : 1, duration: 0.8, ease: "power2.out", overwrite: "auto" });
  };

  if (!items.length) return null;

  return (
    <div
      ref={rootRef}
      className={cn("pointer-events-none absolute inset-0 touch-pan-y select-none", className)}
      aria-roledescription="carousel"
      aria-label="Recent work"
    >
      <div ref={stageRef} className="absolute inset-0 will-change-transform">
        {Array.from({ length: SLOTS }, (_, i) => {
          const item = items[i % items.length];
          return (
            <div
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              data-slot={i}
              data-cursor="Explore"
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover(i)}
              onPointerLeave={() => setHover(-1)}
              className="pointer-events-auto absolute left-0 top-0 cursor-grab will-change-transform active:cursor-grabbing"
              style={{ width: 266, height: 351, visibility: "hidden" }}
              aria-hidden={i >= items.length}
            >
              <div className="relative size-full overflow-hidden rounded-[14px] bg-surface shadow-[0_16px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
                <Image
                  {...imageProps(item.src)}
                  alt={i < items.length ? item.alt : ""}
                  fill
                  draggable={false}
                  loading="eager"
                  fetchPriority={i < 6 ? "high" : "auto"}
                  sizes="(max-width: 768px) 46vw, 22vw"
                  className="pointer-events-none object-cover"
                />
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.18)_50%,transparent_65%)] bg-[length:250%_100%] bg-[position:120%_0] opacity-70" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
