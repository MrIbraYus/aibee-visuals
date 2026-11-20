"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { introStore } from "@/lib/store";
import { LogoMark } from "@/components/brand/Logo";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Intro curtain: the logomark spins in, a counter runs to 100 while fonts
 * load, then the curtain lifts with a curved edge and hands off to the hero.
 */
export function Preloader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const root = rootRef.current!;
      const q = gsap.utils.selector(root);
      const count = q("[data-count]")[0] as HTMLElement;
      const reduced = prefersReducedMotion();
      const remember = () => {
        try {
          sessionStorage.setItem("aibee-intro", "1");
        } catch {}
      };

      // Seen this session (or arrived via client-side navigation): skip.
      if (introStore.get() || document.documentElement.classList.contains("intro-seen")) {
        introStore.set(true);
        setDone(true);
        return;
      }

      if (reduced) {
        const tl = gsap.timeline({
          onComplete: () => {
            remember();
            setDone(true);
          },
        });
        tl.to(root, { autoAlpha: 0, duration: 0.4, delay: 0.2 }).call(() => introStore.set(true), [], 0.2);
        return;
      }

      const counter = { v: 0 };
      const fontsReady = document.fonts?.ready ?? Promise.resolve();

      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          remember();
          setDone(true);
        },
      });
      tl.from(q("[data-mark]"), { scale: 0.3, rotate: -200, autoAlpha: 0, duration: 1.3, ease: "expo.out" })
        .from(q("[data-word] > span"), { yPercent: 110, duration: 1, stagger: 0.05, ease: "expo.out" }, 0.15)
        .from(q("[data-meta]"), { autoAlpha: 0, y: 12, duration: 0.8, stagger: 0.08 }, 0.25)
        .to(
          counter,
          {
            v: 100,
            duration: 1.7,
            ease: "power2.inOut",
            onUpdate: () => {
              count.textContent = String(Math.round(counter.v)).padStart(3, "0");
            },
          },
          0.1,
        )
        .to(q("[data-bar]"), { scaleX: 1, duration: 1.7, ease: "power2.inOut" }, 0.1)
        .to(q("[data-mark]"), { rotate: 180, scale: 0.85, duration: 0.7, ease: "expo.inOut" }, ">-0.1")
        .to(q("[data-fade]"), { autoAlpha: 0, y: -24, duration: 0.6, stagger: 0.03, ease: "power3.in" }, "<")
        .call(() => introStore.set(true), [], ">-0.15")
        .to(root, { yPercent: -100, duration: 1.15, ease: "expo.inOut" }, "<")
        .to(q("[data-curve]"), { attr: { d: "M0,0 L100,0 Q50,0 0,0 Z" }, duration: 1.15, ease: "power2.in" }, "<");

      // Play once fonts are ready (capped so slow phones/networks never block).
      const start = () => tl.play();
      const timer = window.setTimeout(start, 1200);
      fontsReady.then(() => {
        window.clearTimeout(timer);
        start();
      });
      // Fail-safe: whatever happens (throttled timers, background tab, slow
      // device), the site opens and scrolling unlocks after 6 seconds.
      const failsafe = window.setTimeout(() => {
        tl.kill();
        introStore.set(true);
        remember();
        setDone(true);
      }, 6000);
      return () => {
        window.clearTimeout(timer);
        window.clearTimeout(failsafe);
      };
    },
    { scope: rootRef },
  );

  if (done) return null;

  return (
    <div
      ref={rootRef}
      data-preloader
      className="fixed inset-0 z-[100] flex flex-col bg-ink text-white"
      aria-hidden
    >
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6">
        <div data-mark className="will-change-transform">
          <LogoMark className="size-20 sm:size-24" />
        </div>
        <div data-fade className="font-logo text-3xl sm:text-4xl">
          <span data-word className="line-mask inline-flex">
            {"Aibee".split("").map((c, i) => (
              <span key={i} className="inline-block font-extrabold">
                {c}
              </span>
            ))}
            <span className="inline-block w-2" />
            {"Visuals".split("").map((c, i) => (
              <span key={`v${i}`} className="inline-block tracking-[-0.05em]">
                {c}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="frame flex items-end justify-between pb-8">
        <div data-meta data-fade className="text-[13px] text-muted">
          Creative. Strategic. Impactful.
        </div>
        <div data-meta data-fade className="serif-i text-6xl leading-none sm:text-8xl">
          <span data-count>000</span>
        </div>
      </div>
      <div className="h-[3px] w-full bg-white/10">
        <div data-bar className="h-full origin-left scale-x-0 bg-lime" />
      </div>
      {/* curved trailing edge for the lift-off */}
      <svg
        className="pointer-events-none absolute inset-x-0 top-full h-[12vh] w-full fill-ink"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path data-curve d="M0,0 L100,0 Q50,100 0,0 Z" />
      </svg>
    </div>
  );
}
