"use client";

import { useRef } from "react";
import { navLinks, site } from "@/content/site";
import { Logo } from "@/components/brand/Logo";
import { RollText } from "@/components/ui/Primitives";
import { gsap, useGSAP } from "@/lib/gsap";
import { useSectionNav } from "@/lib/useSectionNav";
import { prefersReducedMotion } from "@/lib/utils";
import { telUrl, whatsappUrl } from "@/lib/contact";

function SocialIcon({ short }: { short: string }) {
  if (short === "ig")
    return (
      <svg viewBox="0 0 24 24" className="size-[22px]" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
      </svg>
    );
  if (short === "be") return <span className="font-logo text-[19px] font-extrabold leading-none">Bē</span>;
  return <span className="font-logo text-[20px] font-extrabold leading-none">in</span>;
}

const WORDMARK = "AIBEE VISUALS";

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { go } = useSectionNav();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(ref);
      gsap.from(q("[data-wm-char]"), {
        yPercent: 100,
        stagger: 0.035,
        duration: 1.3,
        ease: "expo.out",
        scrollTrigger: { trigger: q("[data-wordmark]"), start: "top 95%" },
      });
    },
    { scope: ref },
  );

  return (
    <footer ref={ref} className="relative z-10 overflow-hidden border-t border-white/10 bg-ink">
      <div className="frame">
        <div className="flex flex-col gap-8 py-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-14">
            <button type="button" onClick={() => go("#home")} aria-label="Aibee Visuals — home" className="w-fit">
              <Logo />
            </button>
            <p className="text-[13px] text-muted">{site.tagline}</p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-muted">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <button type="button" onClick={() => go(l.href)} className="group hover:text-white">
                    <RollText>{l.label}</RollText>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <ul className="flex items-center gap-6">
            {site.socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="grid size-11 place-items-center rounded-full text-white transition-colors duration-300 hover:bg-lime hover:text-ink"
                >
                  <SocialIcon short={s.short} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div data-wordmark aria-hidden className="select-none overflow-hidden border-t border-white/10 pt-6">
          <p className="flex justify-between font-logo text-[clamp(40px,10.6vw,170px)] font-extrabold leading-[0.82] tracking-[-0.02em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.22)]">
            {WORDMARK.split("").map((c, i) => (
              <span
                key={i}
                data-wm-char
                className="inline-block transition-colors duration-300 hover:text-lime hover:[-webkit-text-stroke:1px_#b7f500]"
              >
                {c === " " ? " " : c}
              </span>
            ))}
          </p>
        </div>

        <div className="flex flex-col gap-2 py-8 pb-24 text-[12px] text-muted sm:flex-row sm:justify-between sm:pb-8 sm:pr-24">
          <p>© 2026 Aibee Visuals. All rights reserved.</p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <a href={`mailto:${site.email}`} className="hover:text-white">
              {site.email}
            </a>
            <a href={telUrl()} className="hover:text-white">
              {site.phone}
            </a>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-[#25d366]">
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
