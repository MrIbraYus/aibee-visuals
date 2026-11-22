"use client";

import Image from "next/image";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import type { Testimonial } from "@/lib/content/types";
import { imageProps } from "@/lib/media/urls";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { cn, prefersReducedMotion } from "@/lib/utils";

/** Seconds each quote stays up before the next one rolls in. */
const DWELL = 8;
const ACCENTS = ["#b7f500", "#e90059", "#1261f5", "#00b94f"];
const ease = [0.16, 1, 0.3, 1] as const;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** Long quotes get a smaller size so every one fits comfortably. */
const quoteSize = (q: string) =>
  q.length > 320
    ? "text-[clamp(19px,1.9vw,27px)]"
    : q.length > 160
      ? "text-[clamp(22px,2.4vw,34px)]"
      : "text-[clamp(26px,3.1vw,44px)]";

function Avatar({ t, accent, className }: { t: Testimonial; accent: string; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-ink", className)}
      style={{ background: accent }}
    >
      {t.avatar ? (
        <Image {...imageProps(t.avatar.url)} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        initials(t.name)
      )}
    </span>
  );
}

function Quote({ t, animate }: { t: Testimonial; animate: boolean }) {
  const words = t.quote.split(/\s+/);
  const stagger = Math.min(0.03, 0.8 / words.length);
  return (
    <p className={cn("font-medium leading-[1.18] tracking-[-0.025em]", quoteSize(t.quote))}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top">
          <motion.span
            className="inline-block"
            initial={animate ? { y: "105%" } : false}
            animate={{ y: "0%" }}
            transition={{ duration: 0.9, ease, delay: i * stagger }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </p>
  );
}

/** What clients say — one quote at a time, rolling on by itself. */
export function Testimonials({ items }: { items: Testimonial[] }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { amount: 0.4 });
  const many = items.length > 1;
  const current = items[active] ?? items[0];
  const running = many && inView && !paused && !reduced;

  const go = (i: number) => setActive(((i % items.length) + items.length) % items.length);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(ref);
      const split = SplitText.create(q("[data-t-heading]"), { type: "lines,words", mask: "lines" });
      gsap
        .timeline({ scrollTrigger: { trigger: ref.current, start: "top 70%" } })
        .from(split.words, { yPercent: 110, stagger: 0.05, duration: 1.1 }, 0)
        .from(q("[data-t-mark]"), { scale: 0.4, rotate: -20, autoAlpha: 0, duration: 1.2, ease: "back.out(1.6)" }, 0.1);
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      aria-labelledby="testimonials-title"
      className="relative z-10 overflow-hidden bg-ink"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/3 size-[520px] rounded-full opacity-25 blur-3xl transition-colors duration-1000"
        style={{ background: ACCENTS[active % ACCENTS.length] }}
      />
      <div className="frame relative grid gap-10 py-[clamp(72px,8vw,128px)] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <h2
            id="testimonials-title"
            data-t-heading
            className="max-w-[12ch] text-[clamp(36px,3.9vw,56px)] font-semibold leading-[1.02] tracking-[-0.04em]"
          >
            Kind words from <span className="serif-i font-normal">the people we build for.</span>
          </h2>

          {many && (
            <div className="mt-8 hidden items-center gap-2 lg:flex">
              {(["prev", "next"] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => go(active + (dir === "next" ? 1 : -1))}
                  aria-label={dir === "next" ? "Next testimonial" : "Previous testimonial"}
                  className="grid size-12 place-items-center rounded-full border border-white/20 transition-colors hover:border-lime hover:bg-lime hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" className={cn("size-4", dir === "prev" && "rotate-180")} aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative lg:col-span-8">
          <span
            data-t-mark
            aria-hidden
            className="serif-i absolute -left-1 -top-10 select-none text-[150px] leading-none sm:-top-14 sm:text-[200px] lg:-left-16 lg:-top-20"
            style={{ color: ACCENTS[active % ACCENTS.length], transition: "color 1s" }}
          >
            &ldquo;
          </span>

          <motion.div
            className="relative touch-pan-y pt-14 sm:pt-16 lg:pt-0"
            drag={many ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(active + 1);
              else if (info.offset.x > 60) go(active - 1);
            }}
          >
            {/* Every quote sits in the same cell (invisibly) so the height never jumps. */}
            <div className="grid">
              {items.map((t) => (
                <div key={t.id} aria-hidden className="invisible col-start-1 row-start-1">
                  <Quote t={t} animate={false} />
                  <div className="mt-9 h-14" />
                </div>
              ))}
              <div className="col-start-1 row-start-1" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.figure
                    key={current.id}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -12, transition: { duration: 0.35 } }}
                  >
                    <blockquote>
                      <Quote t={current} animate={!reduced} />
                    </blockquote>
                    <motion.figcaption
                      className="mt-9 flex items-center gap-4"
                      initial={reduced ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease, delay: 0.35 }}
                    >
                      <Avatar t={current} accent={ACCENTS[active % ACCENTS.length]} className="size-14 text-[17px]" />
                      <span>
                        <span className="block text-[17px] font-semibold">{current.name}</span>
                        {current.role && <span className="serif-i block text-[19px] leading-tight text-white/65">{current.role}</span>}
                      </span>
                    </motion.figcaption>
                  </motion.figure>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {many && (
            <div className="mt-10 flex gap-2" role="tablist" aria-label="Testimonials">
              {items.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Testimonial from ${t.name}`}
                  onClick={() => go(i)}
                  className="group relative h-10 flex-1 sm:max-w-[120px]"
                >
                  <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/15 transition-colors group-hover:bg-white/30">
                    {i < active && <span className="absolute inset-0 bg-white/60" />}
                    {i === active && (
                      <span
                        key={`${active}-${t.id}`}
                        className="absolute inset-0 origin-left bg-lime"
                        style={{
                          animation: reduced ? "none" : `t-fill ${DWELL}s linear forwards`,
                          animationPlayState: running ? "running" : "paused",
                          transform: reduced ? "scaleX(1)" : undefined,
                        }}
                        onAnimationEnd={() => go(active + 1)}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
