"use client";

import { useSyncExternalStore } from "react";

/** Live result of a CSS media query (false during server rendering). */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Desktop-class device: wide screen with a mouse/trackpad. */
export const useIsDesktop = () => useMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
