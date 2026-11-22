"use client";

import Image from "next/image";
import { Fragment, useRef } from "react";
import { imageProps } from "@/lib/media/urls";
import { gsap, useGSAP } from "@/lib/gsap";
import { LogoMark } from "@/components/brand/Logo";
import { prefersReducedMotion } from "@/lib/utils";

type Piece = { text: string; serif?: boolean } | { image: number };

/** The statement, with small windows of real work set into the sentence. */
const statement: Piece[] = [
  { text: "We turn" },
  { image: 0 },
  { text: "ideas into", serif: false },
  { text: "identities,", serif: true },
  { image: 1 },
  { text: "campaigns into" },
  { text: "conversations,", serif: true },
  { text: "and" },
  { image: 2 },
  { text: "screens into experiences people" },
  { text: "remember.", serif: true },
];

export function Manifesto({ images }: { images: string[] }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      if (prefersReducedMotion()) return;
      const trigger = { trigger: q("[data-statement]")[0], start: "top 80%", end: "bottom 55%", scrub: true };
      gsap.fromTo(q("[data-word]"), { opacity: 0.14 }, { opacity: 1, stagger: 0.08, ease: "none", scrollTrigger: trigger });
      gsap.fromTo(
        q("[data-pill]"),
        { width: 0, opacity: 0 },
        { width: "1.7em", opacity: 1, stagger: 0.3, ease: "power2.out", scrollTrigger: trigger },
      );
      gsap.from(q("[data-sign]"), {
        autoAlpha: 0,
        y: 20,
        duration: 1,
        scrollTrigger: { trigger: q("[data-sign]")[0], start: "top 90%" },
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-label="What we believe" className="relative z-10 overflow-hidden bg-ink">
      <div className="grain" />
      <div className="frame relative py-[clamp(96px,12vw,180px)]">
        <p
          data-statement
          className="max-w-[20ch] text-[clamp(36px,5.6vw,92px)] font-semibold leading-[1.04] tracking-[-0.045em] text-white"
        >
          {statement.map((piece, i) => {
            if ("image" in piece) {
              const url = images[piece.image % Math.max(1, images.length)];
              if (!url) return null;
              return (
                <span
                  key={i}
                  data-pill
                  className="relative mx-[0.12em] inline-block h-[0.78em] w-[1.7em] overflow-hidden rounded-full align-[-0.06em]"
                >
                  <Image {...imageProps(url)} alt="" fill sizes="160px" loading="eager" fetchPriority="low" className="object-cover" />
                </span>
              );
            }
            return (
              <Fragment key={i}>
                {piece.text.split(" ").map((w, j) => (
                  <span key={j} data-word className={piece.serif ? "serif-i font-normal tracking-[-0.02em] text-lime" : undefined}>
                    {w}{" "}
                  </span>
                ))}
              </Fragment>
            );
          })}
        </p>
        <div data-sign className="mt-12 flex items-center gap-3 text-[14px] text-muted">
          <LogoMark className="size-7" />
          <span>The Aibee Visuals way</span>
        </div>
      </div>
    </section>
  );
}
