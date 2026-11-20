"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { introStore, lenisStore } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Lenis smooth scrolling driven by GSAP's ticker so ScrollTrigger and Lenis
 * share a single animation frame. Scrolling is locked until the intro ends.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const isAdmin = usePathname()?.startsWith("/admin") ?? false;

  useEffect(() => {
    // The dashboard uses native scrolling.
    if (isAdmin) {
      introStore.set(true);
      return;
    }
    const reduced = prefersReducedMotion();
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const lenis = new Lenis({
      lerp: reduced ? 1 : 0.085,
      smoothWheel: !reduced,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    lenisStore.set(lenis);

    // Keep the page still while the preloader plays.
    let unsubscribe: (() => void) | undefined;
    const preloading = !introStore.get() && document.querySelector("[data-preloader]") && !document.documentElement.classList.contains("intro-seen");
    if (!preloading) introStore.set(true);
    else {
      lenis.stop();
      unsubscribe = introStore.subscribe(() => {
        if (introStore.get()) lenis.start();
      });
    }

    // Fonts change line heights; re-measure every trigger once they land.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      unsubscribe?.();
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisStore.set(null);
    };
  }, [isAdmin]);

  return <>{children}</>;
}
