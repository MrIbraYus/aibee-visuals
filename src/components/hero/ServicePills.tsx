"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type Ref } from "react";
import { pillTones, whatWeDo } from "@/content/site";
import { scrollToTarget } from "@/lib/store";
import { cn } from "@/lib/utils";

const COUNT = pillTones.length;
/** Milliseconds between swaps — one pill changes at a time. */
const EVERY = 2200;
/** Pills take turns in this order so the change hops around the row. */
const ORDER = [0, 2, 1, 3];

/**
 * "What we do" pills under the hero headline. Every couple of seconds one
 * pill rolls to the next service; hovering flips it to a contrasting colour
 * and holds its label still.
 */
export function ServicePills({ ref, active }: { ref?: Ref<HTMLDivElement>; active: boolean }) {
  const reduced = useReducedMotion();
  const [labels, setLabels] = useState<string[]>(() => whatWeDo.slice(0, COUNT));
  const labelsRef = useRef(labels);
  const cursor = useRef(COUNT);
  const turn = useRef(0);
  const hovered = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      let slot = ORDER[turn.current++ % ORDER.length];
      if (slot === hovered.current) slot = ORDER[turn.current++ % ORDER.length];

      const current = labelsRef.current;
      let label: string = whatWeDo[cursor.current++ % whatWeDo.length];
      while (current.includes(label)) label = whatWeDo[cursor.current++ % whatWeDo.length];

      const next = current.slice();
      next[slot] = label;
      labelsRef.current = next;
      setLabels(next);
    }, EVERY);
    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div
      ref={ref}
      className="mt-[clamp(18px,3.6svh,52px)] grid w-full max-w-[380px] grid-cols-2 gap-2.5 md:w-auto md:max-w-none md:grid-cols-[repeat(4,168px)] md:gap-3 lg:grid-cols-[repeat(4,192px)] lg:gap-4"
    >
      {labels.map((label, i) => (
        <button
          key={i}
          type="button"
          data-pill
          onClick={() => scrollToTarget("#services", -20)}
          onPointerEnter={() => (hovered.current = i)}
          onPointerLeave={() => (hovered.current = null)}
          aria-label={`${label}: see our services`}
          className={cn(
            "relative h-10 overflow-hidden rounded-3xl text-[clamp(12px,3.4vw,13px)] font-medium sm:h-11 lg:text-sm",
            "transition-[scale,rotate,background-color,color,box-shadow] duration-500 ease-expo hover:scale-[1.06]",
            i % 2 ? "hover:rotate-[4deg]" : "hover:-rotate-[4deg]",
            pillTones[i],
          )}
        >
          <AnimatePresence initial={false}>
            <motion.span
              key={label}
              aria-hidden
              className="absolute inset-0 grid place-items-center whitespace-nowrap px-3"
              initial={reduced ? { opacity: 0 } : { y: "105%", opacity: 0, filter: "blur(4px)" }}
              animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 0 } : { y: "-105%", opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: reduced ? 0.3 : 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </button>
      ))}
    </div>
  );
}
