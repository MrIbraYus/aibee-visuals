"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Project, Website } from "@/lib/content/types";
import { scrollToTarget } from "@/lib/store";
import { cn } from "@/lib/utils";
import { buildPins, pinLabels, type PinKind } from "./pins";
import { PinCard } from "./PinCard";
import { PinView } from "./PinView";

const KINDS: PinKind[] = ["design", "logo", "illustration", "motion", "website"];
const PIN_EVENT = "aibee:pin";

/* The open piece lives in the URL (#pin-<id>), so links can be shared and
   the phone's back button closes it instead of leaving the page. */
const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  window.addEventListener("hashchange", cb);
  window.addEventListener(PIN_EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(PIN_EVENT, cb);
  };
};
const readHash = () => window.location.hash;
const notify = () => window.dispatchEvent(new Event(PIN_EVENT));

/* Pieces per page: bigger screens show more columns, so they get more per page. */
const PAGE_SIZES = [
  { query: "(min-width: 1280px)", size: 36 }, // desktop: 6 columns × 6 rows
  { query: "(min-width: 768px)", size: 24 }, // tablet
];
const PHONE_PAGE = 16; // phone: 2 columns × 8 rows
const SERVER_PAGE = 36;
const subscribeSize = (cb: () => void) => {
  const lists = PAGE_SIZES.map((t) => window.matchMedia(t.query));
  lists.forEach((l) => l.addEventListener("change", cb));
  return () => lists.forEach((l) => l.removeEventListener("change", cb));
};
const readSize = () => PAGE_SIZES.find((t) => window.matchMedia(t.query).matches)?.size ?? PHONE_PAGE;

/** Page numbers to show: all of them when few, otherwise first, last and the ones around the current page. */
function pageList(page: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const out: (number | "gap")[] = [];
  [...keep].sort((a, b) => a - b).forEach((p, i, arr) => {
    if (i > 0 && p - arr[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

/** Pinterest-style wall of every published design, logo, illustration, animation and website. */
export function WorkWall({ projects, websites }: { projects: Project[]; websites: Website[] }) {
  const pins = useMemo(() => buildPins(projects, websites), [projects, websites]);
  const [filter, setFilter] = useState<PinKind | "all">("all");
  const shown = filter === "all" ? pins : pins.filter((p) => p.kind === filter);
  const counts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, pins.filter((p) => p.kind === k).length])) as Record<PinKind, number>, [pins]);

  // Only one page of work is on the page at a time, so it stays fast as the portfolio grows.
  const pageSize = useSyncExternalStore(subscribeSize, readSize, () => SERVER_PAGE);
  const [pageState, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const page = Math.min(pageState, totalPages);
  const start = (page - 1) * pageSize;
  const visible = shown.slice(start, start + pageSize);
  const wallRef = useRef<HTMLDivElement>(null);

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    const el = wallRef.current;
    if (el) scrollToTarget(el, -110);
  };
  const changeFilter = (k: PinKind | "all") => {
    setFilter(k);
    setPage(1);
  };

  const hash = useSyncExternalStore(subscribe, readHash, () => "");
  const openId = hash.startsWith("#pin-") ? decodeURIComponent(hash.slice(5)) : null;
  const openPin = openId ? (pins.find((p) => p.id === openId) ?? null) : null;
  const pushed = useRef(false);

  const open = useCallback((id: string) => {
    window.history.pushState(null, "", `#pin-${encodeURIComponent(id)}`);
    pushed.current = true;
    notify();
  }, []);
  const select = useCallback(
    (id: string) => {
      window.history.replaceState(null, "", `#pin-${encodeURIComponent(id)}`);
      notify();
      // Keep the wall behind the close-up on the page that holds this piece.
      const i = shown.findIndex((p) => p.id === id);
      if (i >= 0) setPage(Math.floor(i / pageSize) + 1);
    },
    [shown, pageSize],
  );
  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      notify();
    }
  }, []);

  return (
    <>
      <div
        role="tablist"
        aria-label="Filter work"
        className="-mx-[var(--wall-pad)] flex gap-2 overflow-x-auto px-[var(--wall-pad)] pb-1 [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden"
      >
        {(["all", ...KINDS.filter((k) => counts[k] > 0)] as const).map((k) => {
          const active = filter === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeFilter(k)}
              className={cn(
                "relative shrink-0 rounded-full border px-4 py-2 text-[13px] transition-colors duration-300 sm:text-[14px]",
                active ? "border-transparent text-ink" : "border-line text-white/80 hover:border-white/40 hover:text-white",
              )}
            >
              {active && (
                <motion.span layoutId="wall-filter" className="absolute inset-0 rounded-full bg-lime" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
              )}
              <span className="relative">
                {k === "all" ? "All" : pinLabels[k].many}
                <span className={cn("ml-1.5 tabular-nums", active ? "text-ink/55" : "text-white/40")}>{k === "all" ? pins.length : counts[k]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        ref={wallRef}
        key={`${filter}-${page}`}
        className="mt-4 columns-2 gap-2 sm:mt-6 sm:columns-3 sm:gap-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-7"
      >
        {visible.map((pin, i) => (
          <PinCard
            key={pin.id}
            pin={pin}
            index={i}
            onOpen={open}
            // Before the screen size is known (first paint), hide what a smaller page wouldn't show.
            className={cn(i >= PHONE_PAGE && "max-md:hidden", i >= 24 && "md:max-xl:hidden")}
          />
        ))}
      </div>
      {shown.length === 0 && <p className="mt-10 text-muted">Nothing here yet.</p>}

      {totalPages > 1 && (
        <nav aria-label="Work pages" className="mt-10 flex flex-col items-center gap-3 sm:mt-14">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
              className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium transition-colors hover:bg-white hover:text-ink disabled:pointer-events-none disabled:opacity-30 sm:h-11 sm:px-4 sm:text-[14px]"
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>
            {pageList(page, totalPages).map((p, i) =>
              p === "gap" ? (
                <span key={`gap-${i}`} className="w-5 text-center text-white/40 sm:w-7" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                  className={cn(
                    "grid size-9 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors sm:size-11 sm:text-[14px]",
                    p === page ? "bg-lime text-ink" : "border border-line text-white/80 hover:border-white/40 hover:text-white",
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
              className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium transition-colors hover:bg-white hover:text-ink disabled:pointer-events-none disabled:opacity-30 sm:h-11 sm:px-4 sm:text-[14px]"
            >
              <span className="hidden sm:inline">Next</span>
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="text-[12px] text-muted sm:text-[13px]">
            Showing {start + 1}–{start + visible.length} of {shown.length}
          </p>
        </nav>
      )}

      <AnimatePresence>
        {openPin && <PinView key="pin-view" pin={openPin} pins={pins} sequence={shown.some((p) => p.id === openPin.id) ? shown : pins} onSelect={select} onClose={close} />}
      </AnimatePresence>
    </>
  );
}
