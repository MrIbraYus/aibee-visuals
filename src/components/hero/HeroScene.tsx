"use client";

import dynamic from "next/dynamic";
import { getImageProps } from "next/image";
import { useCallback, useRef } from "react";
import { heroPills } from "@/content/site";
import type { Brand } from "@/lib/content/types";
import { whatsappUrl } from "@/lib/contact";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { scrollToTarget, useIntroDone } from "@/lib/store";
import { clamp, cn, easeInOutCubic, lerp, prefersReducedMotion, progress } from "@/lib/utils";
import { ArcMarquee, type ArcItem, type ArcMarqueeHandle } from "./ArcMarquee";
import { imageProps } from "@/lib/media/urls";
import { LogoStrip } from "./LogoStrip";

const HeroRibbons = dynamic(() => import("@/components/three/HeroRibbons"), { ssr: false });

const CLIENT_HEADLINE = "Brands we’ve helped move forward.".split(" ");



/**
 * Hero + "Brands we've helped" scene.
 *
 * Scroll story (pinned):
 *   0.00–0.30  hero copy zooms out and dissolves
 *   0.00–0.60  camera pushes into one card of the arc until it fills the screen
 *   0.60–0.92  that image becomes the backdrop for the client wall
 *   then       the Studio section slides over it like a curtain
 */
export function HeroScene({ items, brands }: { items: ArcItem[]; brands: Brand[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const marquee = useRef<ArcMarqueeHandle>(null);
  const preferredSlot = useRef(-1);
  const introDone = useIntroDone();

  /* ---------------- Entrance (after the preloader) ---------------- */
  useGSAP(
    () => {
      if (!introDone) return;
      const q = gsap.utils.selector(copyRef);
      const reduced = prefersReducedMotion();
      gsap.set(copyRef.current, { autoAlpha: 1 });
      if (reduced) {
        gsap.from(copyRef.current, { autoAlpha: 0, duration: 0.6 });
        return;
      }

      const a = SplitText.create(q("[data-h1-a]"), { type: "words,chars", mask: "words" });
      const b = SplitText.create(q("[data-h1-b]"), { type: "words", mask: "words" });
      const c = SplitText.create(q("[data-lede]"), { type: "lines", mask: "lines" });
      [...a.masks, ...b.masks].forEach((m) => {
        const el = m as HTMLElement;
        el.style.paddingBottom = "0.16em";
        el.style.marginBottom = "-0.16em";
      });

      gsap
        .timeline({
          delay: 0.1,
          onComplete: () => {
            a.revert();
            b.revert();
            c.revert();
          },
        })
        .from(q("[data-eyebrow]"), { y: 18, autoAlpha: 0, duration: 1.1 })
        .from(a.chars, { yPercent: 118, duration: 1.35, stagger: 0.028 }, 0.05)
        .from(b.words, { yPercent: 118, rotate: 7, transformOrigin: "0% 100%", duration: 1.45, stagger: 0.08 }, 0.22)
        .from(c.lines, { yPercent: 105, duration: 1.2, stagger: 0.09 }, 0.5)
        .from(
          q("[data-pill]"),
          {
            scale: 0.2,
            autoAlpha: 0,
            rotate: (i: number) => [-16, 12, -10, 14][i % 4],
            duration: 1.1,
            stagger: 0.08,
            ease: "back.out(1.9)",
          },
          0.65,
        );
    },
    { dependencies: [introDone], scope: sceneRef },
  );

  /* ---------------- Pinned zoom scene ---------------- */
  useGSAP(
    () => {
      const scene = sceneRef.current!;
      const curtain = curtainRef.current!;
      const spacer = spacerRef.current!;
      const zoom = zoomRef.current!;
      const q = gsap.utils.selector(scene);
      const reduced = prefersReducedMotion();
      const state = { zoomP: 0, curtainP: 0, focus: -1 };

      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      tl.fromTo(
        copyRef.current,
        { scale: 1, yPercent: 0, opacity: 1, filter: "blur(0px)" },
        reduced
          ? { opacity: 0, duration: 0.25 }
          : { scale: 0.8, yPercent: -16, opacity: 0, filter: "blur(14px)", duration: 0.3, ease: "power1.in" },
        0,
      )
        .fromTo(q("[data-zoom-inner]"), { scale: reduced ? 1 : 1.2 }, { scale: 1, duration: 0.6, ease: "power2.out" }, 0.3)
        .fromTo(q("[data-shade]"), { opacity: 0 }, { opacity: 1, duration: 0.18 }, 0.56)
        .fromTo(
          q("[data-clients-word]"),
          { yPercent: 120, y: 0, rotate: 5 },
          { yPercent: 0, rotate: 0, duration: 0.14, stagger: 0.018, ease: "power3.out" },
          0.66,
        )
        .fromTo(q("[data-clients-strip]"), { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 0.14, ease: "power3.out" }, 0.76)
        .to({}, { duration: 0.08 });

      const veil = q("[data-veil]")[0] as HTMLElement;

      const update = () => {
        const m = marquee.current;
        if (!m) return;
        const p = state.zoomP;

        if (p <= 0.0005) {
          if (state.focus >= 0) {
            m.setFocus(-1);
            m.setZoom(1, 0, 0);
            m.setPaused(false);
            zoom.style.visibility = "hidden";
            state.focus = -1;
          }
          return;
        }

        if (state.focus < 0) {
          state.focus = preferredSlot.current >= 0 ? preferredSlot.current : m.closestToCenter();
          preferredSlot.current = -1;
          const ex = m.exhibitIndex(state.focus);
          q("[data-zoom-img]").forEach((img, i) => ((img as HTMLElement).style.opacity = i === ex ? "1" : "0"));
          m.setFocus(state.focus);
          m.setPaused(true);
          zoom.style.visibility = "visible";
        }

        const g = m.geometry(state.focus);
        const vw = scene.clientWidth;
        const vh = scene.clientHeight;
        const raw = progress(p, 0, 0.6);
        const e = reduced ? 1 : easeInOutCubic(raw);
        if (!reduced) m.setZoom(1 + Math.pow(raw, 1.5) * 3.4, g.cx, g.cy);

        const w = lerp(g.w, vw, e);
        const h = lerp(g.h, vh, e);
        const cx = lerp(g.cx, vw / 2, e);
        const cy = lerp(g.cy, vh / 2, e);
        zoom.style.width = `${w}px`;
        zoom.style.height = `${h}px`;
        zoom.style.borderRadius = `${lerp(14, 0, e)}px`;
        zoom.style.opacity = reduced ? String(progress(p, 0, 0.3)) : "1";
        zoom.style.transform = `translate3d(${cx - w / 2}px, ${cy - h / 2}px, 0) rotate(${lerp(g.rot, 0, e)}deg)`;
      };
      gsap.ticker.add(update);

      const st = ScrollTrigger.create({
        trigger: scene,
        start: "top top",
        end: () => `+=${spacer.offsetHeight + scene.offsetHeight}`,
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          const scrolled = self.scroll() - self.start;
          const zd = spacer.offsetHeight;
          state.zoomP = clamp(scrolled / zd, 0, 1);
          state.curtainP = clamp((scrolled - zd) / scene.offsetHeight, 0, 1);
          tl.progress(state.zoomP);
          const c = state.curtainP;
          curtain.style.transform = c > 0 ? `translate3d(0, ${-c * 8}%, 0) scale(${1 - c * 0.12})` : "";
          curtain.style.borderRadius = c > 0 ? `${c * 40}px` : "";
          veil.style.opacity = String(c * 0.85);
        },
      });

      return () => {
        gsap.ticker.remove(update);
        st.kill();
      };
    },
    { scope: wrapRef },
  );

  const onCardClick = useCallback((slot: number) => {
    const wrap = wrapRef.current;
    const spacer = spacerRef.current;
    if (!wrap || !spacer) return;
    preferredSlot.current = slot;
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    scrollToTarget(top + spacer.offsetHeight * 0.96);
  }, []);

  return (
    <div id="home" ref={wrapRef} className="relative">
      <section
        ref={sceneRef}
        aria-label="Introduction"
        className="relative h-svh min-h-[620px] w-full overflow-hidden bg-ink"
      >
        <div ref={curtainRef} className="absolute inset-0 origin-top overflow-hidden will-change-transform">
          <HeroRibbons className="!absolute inset-0 z-0" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/3 bg-gradient-to-t from-ink/60 to-transparent" />

          {/* Copy */}
          <div
            ref={copyRef}
            className="relative z-20 flex flex-col items-center px-4 pt-[clamp(108px,17svh,168px)] text-center will-change-transform"
          >
            <a
              data-eyebrow
              href={whatsappUrl("Hi Aibee Visuals! I'd like to talk about a project.")}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-2.5 pr-3.5 text-[12px] text-white/80 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white"
            >
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-lime opacity-70" />
                <span className="relative size-2 rounded-full bg-lime" />
              </span>
              Booking new projects
              <span className="text-white/40 transition-transform duration-500 ease-expo group-hover:translate-x-0.5">→</span>
            </a>
            <h1 className="mt-4 text-white sm:mt-5">
              <span
                data-h1-a
                className="block text-[clamp(42px,min(7.5vw,10.4svh),108px)] font-semibold leading-[1.02] tracking-[-0.04em]"
              >
                We Build Brands
              </span>
              <span
                data-h1-b
                className="serif-i -mt-[0.02em] block text-[clamp(48px,min(8.6vw,12svh),124px)] leading-[1.02] tracking-[-0.04em]"
              >
                That Make an Impact.
              </span>
            </h1>
            <p
              data-lede
              className="mt-[clamp(16px,3.2svh,40px)] max-w-[640px] text-[clamp(15px,1.25vw,18px)] leading-[1.45] text-muted"
            >
              We combine strategic thinking, bold creativity and digital expertise to help businesses build distinctive
              brands and meaningful digital experiences.
            </p>
            <div ref={pillsRef} className="mt-[clamp(18px,3.6svh,52px)] flex flex-wrap justify-center gap-2.5 sm:gap-4">
              {heroPills.map((pill, i) => (
                <button
                  key={pill.label}
                  type="button"
                  data-pill
                  onClick={() => scrollToTarget(pill.href, -20)}
                  className={cn(
                    "h-10 rounded-3xl px-4 text-[13px] leading-[1.6] transition-[scale,rotate] duration-500 ease-expo sm:h-11 sm:w-[150px] sm:text-sm",
                    i % 2 ? "hover:rotate-[4deg]" : "hover:-rotate-[4deg]",
                    "hover:scale-[1.06]",
                    pill.className,
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* The arc */}
          <ArcMarquee ref={marquee} items={items} anchorRef={pillsRef} onCardClick={onCardClick} className="z-10" />

          {/* Zoom clone — expands from the chosen card to full screen */}
          <div
            ref={zoomRef}
            className="pointer-events-none absolute left-0 top-0 z-30 overflow-hidden will-change-transform"
            style={{ visibility: "hidden", width: 0, height: 0 }}
            aria-hidden
          >
            <div data-zoom-inner className="absolute inset-0 will-change-transform">
              {introDone &&
                items.map((item, i) => {
                  const { props } = getImageProps({ ...imageProps(item.src), alt: "", sizes: "100vw", fill: true });
                  return (
                    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                    <img
                      key={i}
                      {...props}
                      data-zoom-img
                      loading="eager"
                      fetchPriority="low"
                      className="absolute inset-0 size-full object-cover opacity-0"
                    />
                  );
                })}
            </div>
            <div
              data-shade
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,8,8,0.55),rgba(8,8,8,0.88))] opacity-0"
            />
            <div className="grain" />
          </div>

          {/* Section 02 — Brands we've helped move forward */}
          <div
            className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-end pb-[clamp(24px,7svh,72px)]"
            aria-labelledby="clients-title"
            role="region"
          >
            <div className="frame flex flex-1 flex-col items-center justify-center text-center">
              <h2
                id="clients-title"
                className="serif-i max-w-[14ch] text-[clamp(48px,8vw,128px)] leading-[0.95] tracking-[-0.03em] text-white"
              >
                {CLIENT_HEADLINE.map((word, i) => (
                  <span key={i} className="inline-block overflow-clip pb-[0.12em] -mb-[0.12em] align-bottom">
                    <span data-clients-word className="inline-block" style={{ transform: "translateY(120%)" }}>
                      {word}
                      {i < CLIENT_HEADLINE.length - 1 ? " " : ""}
                    </span>
                  </span>
                ))}
              </h2>
            </div>
            <div
              data-clients-strip
              className="pointer-events-auto border-y border-white/10 bg-black/35 py-5 opacity-0 backdrop-blur-md sm:py-7"
            >
              <LogoStrip brands={brands} />
            </div>
          </div>

          <div data-veil className="pointer-events-none absolute inset-0 z-50 bg-ink opacity-0" />
        </div>
      </section>
      <div ref={spacerRef} aria-hidden className="h-[170svh]" />
    </div>
  );
}
