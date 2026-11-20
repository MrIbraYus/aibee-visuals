"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { isFinePointer } from "@/lib/utils";

/**
 * Contextual cursor. Any element with `data-cursor="Label"` turns the
 * follower into a lime badge with that label; `data-cursor-color` overrides
 * the badge colour. Hidden on touch devices.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isFinePointer()) return;
    const dot = dotRef.current!;
    const badge = badgeRef.current!;
    const label = labelRef.current!;

    gsap.set([dot, badge], { xPercent: -50, yPercent: -50, opacity: 1 });
    gsap.set(badge, { scale: 0 });
    const dotX = gsap.quickTo(dot, "x", { duration: 0.18, ease: "power3.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.18, ease: "power3.out" });
    const badgeX = gsap.quickTo(badge, "x", { duration: 0.55, ease: "power3.out" });
    const badgeY = gsap.quickTo(badge, "y", { duration: 0.55, ease: "power3.out" });

    let current: string | null = null;

    const onMove = (e: PointerEvent) => {
      dotX(e.clientX);
      dotY(e.clientY);
      badgeX(e.clientX);
      badgeY(e.clientY);
    };

    const onOver = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor]");
      const next = target?.dataset.cursor ?? null;
      if (next === current) return;
      current = next;
      if (next) {
        label.textContent = next;
        badge.style.background = target?.dataset.cursorColor ?? "var(--color-lime)";
        gsap.to(badge, { scale: 1, duration: 0.5, ease: "back.out(1.7)" });
        gsap.to(dot, { scale: 0, duration: 0.25 });
      } else {
        gsap.to(badge, { scale: 0, duration: 0.35, ease: "power3.out" });
        gsap.to(dot, { scale: 1, duration: 0.25 });
      }
    };

    const onDown = () => gsap.to([dot, badge], { scale: (i) => (i === 0 ? 0.6 : current ? 0.88 : 0), duration: 0.2 });
    const onUp = () => gsap.to([dot, badge], { scale: (i) => (i === 0 ? (current ? 0 : 1) : current ? 1 : 0), duration: 0.3 });
    const onLeave = () => gsap.to([dot, badge], { opacity: 0, duration: 0.2 });
    const onEnter = () => gsap.to([dot, badge], { opacity: 1, duration: 0.2 });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] hidden [@media(hover:hover)_and_(pointer:fine)]:block">
      <div
        ref={dotRef}
        className="absolute left-0 top-0 size-2.5 rounded-full bg-white opacity-0 mix-blend-difference"
      />
      <div
        ref={badgeRef}
        className="absolute left-0 top-0 grid size-[92px] place-items-center rounded-full bg-lime opacity-0 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
      >
        <span ref={labelRef} className="px-2 text-center text-[13px] font-medium leading-tight text-ink" />
      </div>
    </div>
  );
}
