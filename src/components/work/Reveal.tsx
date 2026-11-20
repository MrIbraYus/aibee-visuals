"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn, prefersReducedMotion } from "@/lib/utils";

/** Fades/rises its direct children into view as they enter the viewport. */
export function Reveal({ children, className, stagger = 0.08 }: { children: ReactNode; className?: string; stagger?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const items = Array.from(ref.current!.children) as HTMLElement[];
      gsap.from(items, {
        y: 50,
        autoAlpha: 0,
        duration: 1.2,
        stagger,
        ease: "expo.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%" },
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
