"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { scrollToTarget } from "@/lib/store";
import { PillButton } from "@/components/ui/Primitives";
import { LogoMark } from "@/components/brand/Logo";
import { prefersReducedMotion } from "@/lib/utils";

const LogoMark3D = dynamic(() => import("@/components/three/LogoMark3D"), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center">
      <LogoMark className="size-40 opacity-20" />
    </div>
  ),
});

/** The Studio — cream curtain with a living 3D logomark. */
export function Studio() {
  const ref = useRef<HTMLElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const scrollP = useRef(0);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const q = gsap.utils.selector(ref);

      ScrollTrigger.create({
        trigger: ref.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => (scrollP.current = self.progress),
      });

      if (reduced) return;

      // Reading effect: the headline "inks in" word by word as you scroll.
      const split = SplitText.create(q("[data-studio-heading]"), { type: "words" });
      gsap.fromTo(
        split.words,
        { opacity: 0.12, filter: "blur(3px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          stagger: 0.12,
          ease: "none",
          scrollTrigger: { trigger: q("[data-studio-heading]"), start: "top 85%", end: "bottom 45%", scrub: true },
        },
      );

      gsap.from(q("[data-studio-reveal]"), {
        y: 40,
        autoAlpha: 0,
        stagger: 0.1,
        duration: 1.2,
        scrollTrigger: { trigger: q("[data-studio-heading]"), start: "top 60%" },
      });



      // Orbiting lime dot: passes behind the 3D mark, then in front of it.
      const orbit = orbitRef.current!;
      const front = q("[data-dot-front]")[0] as HTMLElement;
      const back = q("[data-dot-back]")[0] as HTMLElement;
      const o = { a: 0 };
      gsap.to(o, { a: Math.PI * 2, duration: 9, ease: "none", repeat: -1 });
      const tick = () => {
        const w = orbit.clientWidth;
        const h = orbit.clientHeight;
        const x = w / 2 + Math.cos(o.a) * w * 0.47;
        const y = h / 2 + Math.sin(o.a) * h * 0.19;
        const inFront = Math.sin(o.a) > 0;
        const s = 0.75 + 0.35 * (Math.sin(o.a) + 1) * 0.5;
        const t = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${s})`;
        front.style.transform = t;
        back.style.transform = t;
        front.style.opacity = inFront ? "1" : "0";
        back.style.opacity = inFront ? "0" : "1";
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: ref },
  );

  return (
    <section
      id="studio"
      ref={ref}
      className="relative z-10 overflow-hidden rounded-t-[28px] bg-cream text-ink shadow-[0_-30px_80px_rgba(0,0,0,0.45)] sm:rounded-t-[48px]"
    >
      <div className="frame grid items-center gap-y-10 py-[clamp(72px,10vw,140px)] lg:grid-cols-12 lg:gap-x-8">
        {/* Copy */}
        <div className="lg:col-span-5">
          <h2
            data-studio-heading
            className="text-[clamp(40px,4.6vw,66px)] font-semibold leading-[1] tracking-[-0.045em]"
          >
            Good design is more&nbsp;than <br className="hidden sm:block" />
            <span className="serif-i text-[1.14em] font-normal tracking-[-0.03em]">how it feels.</span>
          </h2>
          <p data-studio-reveal className="mt-7 max-w-[400px] text-[17px] leading-[1.5] text-ink/75">
            We shape meaningful brands and digital experiences that connect, inspire and drive real results.
          </p>
          <div data-studio-reveal className="mt-8">
            <PillButton tone="outline-dark" onClick={() => scrollToTarget("#approach", -20)} className="py-3">
              How we work
            </PillButton>
          </div>
        </div>

        {/* 3D mark + orbit */}
        <div className="relative aspect-[1.15] w-full lg:col-span-7 lg:aspect-[1.4]" data-cursor="Move me">
          <div ref={orbitRef} className="absolute inset-[-4%] -rotate-[14deg]">
            {/* back half of the orbit */}
            <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <path d="M3,50 A47,19 0 0 1 97,50" fill="none" stroke="#080808" strokeOpacity="0.45" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            <span data-dot-back className="absolute left-0 top-0 size-5 rounded-full bg-lime shadow-[0_0_0_6px_rgba(183,245,0,0.25)]" />
          </div>
          <LogoMark3D className="!absolute inset-0 z-10" scrollRef={scrollP} />
          <div className="pointer-events-none absolute inset-[-4%] z-20 -rotate-[14deg]">
            <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <path d="M97,50 A47,19 0 0 1 3,50" fill="none" stroke="#080808" strokeOpacity="0.55" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="pointer-events-none absolute inset-[-4%] z-20 -rotate-[14deg]">
            <OrbitFrontDot />
          </div>
        </div>

      </div>
    </section>
  );
}

/** The front-layer dot is driven by the same ticker via data attribute lookup. */
function OrbitFrontDot() {
  return <span data-dot-front className="absolute left-0 top-0 size-5 rounded-full bg-lime opacity-0 shadow-[0_0_0_6px_rgba(183,245,0,0.25)]" />;
}
