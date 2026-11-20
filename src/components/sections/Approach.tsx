"use client";

import { useRef } from "react";
import { steps } from "@/content/site";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";

/** 04 / Our approach — a timeline that draws itself as you scroll. */
export function Approach() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const reduced = prefersReducedMotion();
      const dots = q("[data-step-dot]");
      const items = q("[data-step]");

      if (reduced) {
        gsap.set(q("[data-progress]"), { scaleX: 1, scaleY: 1 });
        gsap.set(dots, { backgroundColor: "#b7f500" });
        return;
      }

      const split = SplitText.create(q("[data-ap-heading]"), { type: "words", mask: "words" });
      split.masks.forEach((m) => {
        (m as HTMLElement).style.paddingBottom = "0.16em";
        (m as HTMLElement).style.marginBottom = "-0.16em";
      });
      gsap.from(split.words, {
        yPercent: 115,
        rotate: 4,
        stagger: 0.06,
        duration: 1.2,
        scrollTrigger: { trigger: ref.current, start: "top 70%" },
      });

      const mm = gsap.matchMedia();
      mm.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)" }, (ctx) => {
        const desktop = ctx.conditions?.desktop;
        const lit = new Set<number>();
        gsap.set(items, { autoAlpha: 0.25, y: 24 });
        ScrollTrigger.create({
          trigger: q("[data-track]")[0],
          start: desktop ? "top 75%" : "top 70%",
          end: desktop ? "top 30%" : "bottom 55%",
          scrub: 0.6,
          onUpdate(self) {
            const p = self.progress;
            gsap.set(q("[data-progress]"), desktop ? { scaleX: p, scaleY: 1 } : { scaleY: p, scaleX: 1 });
            gsap.set(q("[data-head]"), desktop ? { left: `${p * 100}%`, top: 0 } : { top: `${p * 100}%`, left: 0 });
            items.forEach((item, i) => {
              const on = p >= (i / steps.length) * 0.98;
              if (on && !lit.has(i)) {
                lit.add(i);
                gsap.to(item, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out" });
                gsap.to(dots[i], { backgroundColor: "#b7f500", duration: 0.4 });
                gsap.fromTo(dots[i], { scale: 1.7 }, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.4)" });
              } else if (!on && lit.has(i)) {
                lit.delete(i);
                gsap.to(item, { autoAlpha: 0.25, y: 24, duration: 0.6 });
                gsap.to(dots[i], { backgroundColor: "#f3f0e8", scale: 1, duration: 0.3 });
              }
            });
          },
        });
      });
    },
    { scope: ref },
  );

  return (
    <section id="approach" ref={ref} className="relative z-10 bg-cream text-ink">
      <div className="frame grid gap-12 py-[clamp(72px,8vw,120px)] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5 xl:col-span-4">
          <h2 data-ap-heading className="text-[clamp(38px,3.9vw,56px)] font-semibold leading-[1.02] tracking-[-0.04em]">
            From first thought to <span className="serif-i text-[1.12em] font-normal tracking-[-0.03em]">lasting impact.</span>
          </h2>
        </div>

        <div data-track className="relative lg:col-span-7 xl:col-span-8">
          {/* Track: horizontal on desktop, vertical on mobile */}
          <div className="absolute left-[7px] top-2 h-[calc(100%-16px)] w-px bg-ink/15 lg:left-0 lg:top-[38px] lg:h-px lg:w-full">
            <div data-progress className="absolute inset-0 origin-top bg-ink lg:origin-left" style={{ transform: "scale(0)" }} />
            <span data-head className="absolute left-0 top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime ring-4 ring-lime/30" />
          </div>

          <ol className="grid gap-10 pl-10 lg:grid-cols-4 lg:gap-6 lg:pl-0">
            {steps.map((step) => (
              <li key={step.title} data-step className="group relative">
                <span
                  data-step-dot
                  className="absolute -left-[38px] top-2 size-[11px] rounded-full border-[1.5px] border-[#4c7a00] bg-cream lg:left-0 lg:top-[33px]"
                />
                <h3 className="text-[22px] font-semibold tracking-[-0.02em] lg:mt-14">{step.title}</h3>
                <p className="mt-2 max-w-[18ch] text-[14px] leading-[1.45] text-ink/70">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
