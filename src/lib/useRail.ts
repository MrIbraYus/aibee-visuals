"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks a horizontally scrolling row: how far along it is (0–1) and whether
 * it sits at either end. When the row doesn't overflow (e.g. it becomes a grid
 * on desktop) both `start` and `end` are true.
 */
export function useRail(ref: RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ progress: 0, start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setState({ progress: max > 0 ? el.scrollLeft / max : 0, start: el.scrollLeft < 8, end: el.scrollLeft > max - 8 });
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [ref]);

  return { ...state, scrollable: !(state.start && state.end) };
}
