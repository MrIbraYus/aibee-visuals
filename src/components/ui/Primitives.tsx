"use client";

import { useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { cn, isFinePointer } from "@/lib/utils";

/** Text that rolls up to a duplicate on hover (parent needs `group`). */
export function RollText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <span className="inline-block transition-transform duration-500 ease-expo group-hover:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 inline-block translate-y-full transition-transform duration-500 ease-expo group-hover:translate-y-0"
      >
        {children}
      </span>
    </span>
  );
}

export function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-5", className)} aria-hidden>
      <path d="M7 17 17 7M8.5 7H17v8.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Wrapper that gently pulls its child toward the pointer. */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.PointerEvent) => {
    if (!isFinePointer()) return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    gsap.to(el, { x, y, duration: 0.6, ease: "power3.out" });
  };
  const onLeave = () => gsap.to(ref.current, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" });

  return (
    <span ref={ref} className={cn("inline-block will-change-transform", className)} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </span>
  );
}

type PillButtonProps = ComponentPropsWithoutRef<"button"> & { tone?: "lime" | "outline-dark" | "outline-light" };

/** Primary CTA (Figma: Nav / Contact CTA). */
export function PillButton({ children, className, tone = "lime", ...rest }: PillButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "group relative inline-flex items-center gap-4 overflow-hidden rounded-full px-6 py-4 text-sm font-medium leading-[1.45] transition-colors duration-300",
        tone === "lime" && "bg-lime text-ink",
        tone === "outline-dark" && "border border-ink/80 text-ink hover:bg-ink hover:text-cream",
        tone === "outline-light" && "border border-white/30 text-white hover:bg-white hover:text-ink",
        className,
      )}
    >
      {tone === "lime" && (
        <span
          aria-hidden
          className="absolute inset-0 translate-y-full rounded-full bg-white transition-transform duration-500 ease-expo group-hover:translate-y-0"
        />
      )}
      <span className="relative">
        <RollText>{children}</RollText>
      </span>
      <ArrowUpRight className="relative transition-transform duration-500 ease-expo group-hover:rotate-45" />
    </button>
  );
}
