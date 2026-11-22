"use client";

import { useRef } from "react";
import type { Website } from "@/lib/content/types";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { ArrowUpRight } from "@/components/ui/Primitives";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { WebsiteCard } from "@/components/work/WebsiteCard";
import { whatsappUrl } from "@/lib/contact";
import { openMessage } from "@/lib/store";
import { cn, prefersReducedMotion } from "@/lib/utils";
import { useRail } from "@/lib/useRail";
import { RailProgress } from "@/components/ui/RailProgress";

/** Lines the first card up with the page grid while the row runs to the screen edge. */
const RAIL_PAD = "max(var(--gutter), calc((100% - 1312px) / 2))";

/**
 * Websites we've designed and built: a swipeable row of live sites (drag or
 * use the arrows on desktop), followed by an open invitation to build yours.
 */
export function Websites({ sites }: { sites: Website[] }) {
  const ref = useRef<HTMLElement>(null);
  const rail = useRef<HTMLUListElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const { progress, start, end, scrollable } = useRail(rail);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(ref);
      const split = SplitText.create(q("[data-sites-heading]"), { type: "lines,words", mask: "lines" });
      gsap
        .timeline({ scrollTrigger: { trigger: ref.current, start: "top 72%" } })
        .from(split.words, { yPercent: 110, stagger: 0.04, duration: 1.1 }, 0)
        .from(q("[data-sites-lede]"), { autoAlpha: 0, y: 24, duration: 1 }, 0.25);
      if (q("[data-site-card]").length) {
        gsap.from(q("[data-site-card]"), {
          autoAlpha: 0,
          x: 80,
          stagger: 0.1,
          duration: 1.2,
          scrollTrigger: { trigger: rail.current, start: "top 85%" },
        });
      }
      gsap.from(q("[data-invite]"), { autoAlpha: 0, y: 50, duration: 1.1, scrollTrigger: { trigger: q("[data-invite]")[0], start: "top 88%" } });
    },
    { scope: ref },
  );

  const step = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector("li");
    const by = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * by, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  // Mouse users can drag the row like a phone swipe.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !rail.current) return;
    drag.current = { x: e.clientX, left: rail.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = rail.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      el.style.scrollSnapType = "none";
      el.style.cursor = "grabbing";
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    const el = rail.current;
    drag.current = null;
    if (!d?.moved || !el) return;
    suppressClick.current = true;
    el.style.cursor = "";
    // Settle on the nearest card, then hand control back to CSS snapping.
    const cards = Array.from(el.querySelectorAll("li"));
    const padLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const target = cards.reduce(
      (best, c) => {
        const left = c.offsetLeft - padLeft;
        return Math.abs(left - el.scrollLeft) < Math.abs(best - el.scrollLeft) ? left : best;
      },
      el.scrollLeft,
    );
    el.scrollTo({ left: target, behavior: "smooth" });
    window.setTimeout(() => (el.style.scrollSnapType = ""), 450);
  };

  return (
    <section id="websites" ref={ref} className="relative z-10 overflow-hidden bg-ink" aria-labelledby="websites-title">
      <div className="frame pt-[clamp(72px,8vw,120px)]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <h2
            id="websites-title"
            data-sites-heading
            className="max-w-[15ch] text-[clamp(36px,3.9vw,56px)] font-semibold leading-[1.02] tracking-[-0.04em]"
          >
            Websites we&apos;ve designed <span className="serif-i font-normal">&amp; built.</span>
          </h2>
          <div data-sites-lede className="flex flex-col gap-5 lg:items-end">
            <p className="max-w-[40ch] text-[15px] leading-[1.55] text-muted lg:text-right">
              From first wireframe to launch day: fast, responsive sites that carry the brand all the way to the screen.
            </p>
            {sites.length > 0 && scrollable && (
              <div className="hidden gap-2 lg:flex">
                {([-1, 1] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => step(dir)}
                    disabled={dir === -1 ? start : end}
                    aria-label={dir === 1 ? "Next websites" : "Previous websites"}
                    className="grid size-12 place-items-center rounded-full border border-white/20 transition-colors hover:border-lime hover:bg-lime hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                  >
                    <svg viewBox="0 0 24 24" className={cn("size-4", dir === -1 && "rotate-180")} aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {sites.length > 0 && (
        <div className="mt-10 lg:mt-14">
          <ul
            ref={rail}
            aria-label="Websites"
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ paddingInline: RAIL_PAD, scrollPaddingInline: RAIL_PAD }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onDragStart={(e) => e.preventDefault()}
            onClickCapture={(e) => {
              if (suppressClick.current) {
                e.preventDefault();
                e.stopPropagation();
                suppressClick.current = false;
              }
            }}
          >
            {sites.map((site, i) => (
              <li key={site.id} data-site-card className="w-[84vw] shrink-0 snap-start sm:w-[62vw] lg:w-[min(54vw,720px)]">
                <WebsiteCard site={site} index={i} />
              </li>
            ))}
          </ul>

          {scrollable && <RailProgress progress={progress} className="frame mt-8" />}
        </div>
      )}

      <div data-invite className="frame pb-[clamp(56px,7vw,110px)] pt-10 lg:pt-14">
        <InviteCard />
      </div>
    </section>
  );
}

/** Closing card: an open invitation to get a site designed and built. */
function InviteCard() {
  return (
    <article
      className="relative overflow-hidden rounded-[28px] border border-lime/25 bg-[#0f0f0f] p-3 sm:p-4 lg:p-5"
      style={{ backgroundImage: "radial-gradient(120% 90% at 100% 0%, rgba(183,245,0,0.16), transparent 55%)" }}
    >
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-12">
        <div className="order-2 px-2 pb-2 sm:px-3 lg:order-1 lg:px-4 lg:pb-0">
          <p className="inline-flex items-center gap-2 text-[13px] text-white/80">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-lime opacity-70" />
              <span className="relative size-2 rounded-full bg-lime" />
            </span>
            yourbrand.com
          </p>
          <h3 className="mt-3 text-[clamp(30px,3.3vw,52px)] font-semibold leading-[1] tracking-[-0.04em]">
            Your website <span className="serif-i font-normal">could be next.</span>
          </h3>
          <p className="mt-4 text-[15px] leading-[1.6] text-muted lg:text-[16px]">
            Landing pages, portfolios, online stores and web apps, designed around your brand and built to load fast on
            every phone. Tell us what you have in mind.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {["UI/UX Design", "Web Development", "React.js"].map((t) => (
              <li key={t} className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/85">
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openMessage("A new website")}
              className="group inline-flex items-center gap-3 rounded-full bg-lime py-2 pl-5 pr-2 text-[14px] font-medium text-ink transition-colors duration-300 hover:bg-white"
            >
              Let&apos;s build yours
              <span className="grid size-9 place-items-center rounded-full bg-ink text-lime transition-transform duration-500 ease-expo group-hover:rotate-45">
                <ArrowUpRight className="size-4" />
              </span>
            </button>
            <a
              href={whatsappUrl("Hi Aibee Visuals! I'd like a website for my brand.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-3 text-[14px] font-medium transition-colors duration-300 hover:border-[#25d366] hover:bg-[#25d366] hover:text-[#06210f]"
            >
              <WhatsAppIcon className="size-4" /> WhatsApp
            </a>
          </div>
        </div>

        {/* A website taking shape: a wireframe with a slow shimmer */}
        <button
          type="button"
          onClick={() => openMessage("A new website")}
          data-cursor="Let's talk"
          aria-label="Start a conversation about a new website"
          className="group order-1 block w-full overflow-hidden rounded-[18px] border border-white/10 bg-[#1a1a1a] text-left shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] lg:order-2"
        >
          <div className="flex h-9 items-center gap-3 border-b border-white/[0.06] px-3.5 sm:h-10">
            <span className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-magenta" />
              <span className="size-2.5 rounded-full bg-lime" />
              <span className="size-2.5 rounded-full bg-blue" />
            </span>
            <span className="mx-auto flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/60 sm:text-[12px]">
              yourbrand.com
              <span className="h-3 w-px animate-pulse bg-lime" aria-hidden />
            </span>
            <span className="w-[42px]" aria-hidden />
          </div>
          <div aria-hidden className="wire relative aspect-[16/10] overflow-hidden bg-ink p-[5%]">
            <div className="flex items-center justify-between">
              <span className="h-3 w-[14%] rounded-full bg-lime/80" />
              <span className="flex w-[34%] gap-[8%]">
                <span className="h-2 flex-1 rounded-full bg-white/15" />
                <span className="h-2 flex-1 rounded-full bg-white/15" />
                <span className="h-2 flex-1 rounded-full bg-white/15" />
              </span>
              <span className="h-5 w-[12%] rounded-full bg-white/20" />
            </div>
            <div className="mt-[7%] grid grid-cols-[1.1fr_1fr] items-center gap-[6%]">
              <div className="flex flex-col gap-2.5 sm:gap-3.5">
                <span className="h-4 w-[92%] rounded-full bg-white/30 sm:h-6" />
                <span className="h-4 w-[70%] rounded-full bg-white/30 sm:h-6" />
                <span className="mt-2 h-2 w-[85%] rounded-full bg-white/12" />
                <span className="h-2 w-[64%] rounded-full bg-white/12" />
                <span className="mt-2 flex gap-3">
                  <span className="h-6 w-[38%] rounded-full bg-lime sm:h-8" />
                  <span className="h-6 w-[30%] rounded-full border border-white/25 sm:h-8" />
                </span>
              </div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-br from-magenta/50 via-blue/40 to-emerald/40 transition-transform duration-[1.4s] ease-expo group-hover:scale-[1.04]">
                <span className="absolute bottom-[10%] left-[10%] h-[18%] w-[45%] rounded-lg bg-white/25 backdrop-blur" />
              </div>
            </div>
          </div>
        </button>
      </div>
    </article>
  );
}
