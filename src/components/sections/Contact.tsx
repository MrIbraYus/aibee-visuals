"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { site } from "@/content/site";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { openProjectDrawer } from "@/lib/store";
import { Magnetic, PillButton } from "@/components/ui/Primitives";
import { isFinePointer, prefersReducedMotion } from "@/lib/utils";
import { telUrl, whatsappUrl } from "@/lib/contact";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

const Swirl3D = dynamic(() => import("@/components/three/Swirl3D"), { ssr: false });

/** CTA — "Have a good idea? Let's make it matter." Letters ripple near the cursor. */
export function Contact() {
  const ref = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollP = useRef(0);
  const [copied, setCopied] = useState(false);

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => (scrollP.current = self.progress),
      });
      if (prefersReducedMotion()) return;

      const split = SplitText.create(q("[data-cta-line]"), { type: "words,chars", mask: "words" });
      split.masks.forEach((m) => {
        (m as HTMLElement).style.paddingBottom = "0.18em";
        (m as HTMLElement).style.marginBottom = "-0.18em";
      });
      gsap.from(split.chars, {
        yPercent: 120,
        stagger: 0.02,
        duration: 1.2,
        scrollTrigger: { trigger: ref.current, start: "top 70%" },
      });
      gsap.from(q("[data-cta-side]"), {
        autoAlpha: 0,
        y: 30,
        stagger: 0.1,
        duration: 1.1,
        scrollTrigger: { trigger: ref.current, start: "top 60%" },
      });

      // Proximity ripple: characters near the pointer lift up.
      if (!isFinePointer()) return;
      const heading = headingRef.current!;
      const chars = split.chars as HTMLElement[];
      const setters = chars.map((c) => gsap.quickTo(c, "y", { duration: 0.5, ease: "power3.out" }));
      let centers: { x: number; y: number }[] = [];
      const measure = () => {
        centers = chars.map((c) => {
          const r = c.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
      };
      const onEnter = () => measure();
      const onMove = (e: PointerEvent) => {
        if (!centers.length) measure();
        const R = 170;
        centers.forEach((c, i) => {
          const d = Math.hypot(e.clientX - c.x, e.clientY - c.y);
          setters[i](d < R ? -Math.pow(1 - d / R, 2) * 26 : 0);
        });
      };
      const onLeave = () => setters.forEach((s) => s(0));
      heading.addEventListener("pointerenter", onEnter);
      heading.addEventListener("pointermove", onMove);
      heading.addEventListener("pointerleave", onLeave);
      return () => {
        heading.removeEventListener("pointerenter", onEnter);
        heading.removeEventListener("pointermove", onMove);
        heading.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref },
  );

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };

  return (
    <section id="contact" ref={ref} className="relative z-10 overflow-hidden bg-ink">
      <Swirl3D
        scrollRef={scrollP}
        className="!absolute -right-[45%] top-[25%] h-[90%] w-[95%] opacity-50 sm:-right-[8%] sm:top-[-10%] sm:h-[130%] sm:w-[44%] sm:opacity-95 lg:-right-[9%] lg:w-[32%]"
      />
      <div className="frame relative grid items-center gap-10 py-[clamp(72px,8vw,120px)] lg:grid-cols-12">
        <h2 ref={headingRef} className="text-white lg:col-span-8" aria-label="Have a good idea? Let's make it matter.">
          <span
            data-cta-line
            aria-hidden
            className="block text-[clamp(44px,5.6vw,84px)] font-semibold leading-[1.02] tracking-[-0.045em]"
          >
            Have a good idea?
          </span>
          <span
            data-cta-line
            aria-hidden
            className="serif-i block text-[clamp(52px,7.4vw,112px)] leading-[1] tracking-[-0.035em]"
          >
            Let&apos;s make it matter.
          </span>
        </h2>

        <div className="relative z-10 flex flex-col items-start gap-6 lg:col-span-4">
          <div data-cta-side>
            <Magnetic strength={0.3}>
              <PillButton onClick={openProjectDrawer} className="px-8 py-5 text-[16px]" data-cursor="Let's go">
                Start a project
              </PillButton>
            </Magnetic>
          </div>
          <div data-cta-side>
            <a
              href={whatsappUrl("Hi Aibee Visuals! I'd like to talk about a project.")}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 rounded-full border border-white/20 py-3 pl-3 pr-6 text-[15px] font-medium text-white transition-colors duration-300 hover:border-[#25d366] hover:bg-[#25d366] hover:text-[#06210f]"
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#25d366] text-[#06210f] transition-colors group-hover:bg-[#06210f] group-hover:text-[#25d366]">
                <WhatsAppIcon className="size-[18px]" />
              </span>
              Chat on WhatsApp
            </a>
          </div>
          <ul data-cta-side className="flex flex-col gap-3 text-[15px] text-white/90">
            <li>
              <button type="button" onClick={copyEmail} className="group flex items-center gap-3" data-cursor={copied ? "Copied!" : "Copy"}>
                <svg viewBox="0 0 24 24" className="size-4 text-lime" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
                  <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                <span className="relative">
                  {copied ? "Copied to clipboard" : site.email}
                  <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-white/70 transition-transform duration-500 group-hover:origin-left group-hover:scale-x-100" />
                </span>
              </button>
            </li>
            <li>
              <a href={telUrl()} className="group flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="size-4 text-lime" aria-hidden>
                  <path
                    d="M6.6 3.5h2.6l1.4 4-1.9 1.3a12 12 0 0 0 6.5 6.5l1.3-1.9 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="relative">
                  {site.phone}
                  <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-white/70 transition-transform duration-500 group-hover:origin-left group-hover:scale-x-100" />
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
