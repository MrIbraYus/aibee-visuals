"use client";

import { useSyncExternalStore } from "react";
import type Lenis from "lenis";

/**
 * Tiny external stores shared across the page without context re-renders.
 */
function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Flips to true once the preloader has finished and the hero may animate in. */
export const introStore = createStore(false);
export const useIntroDone = () =>
  useSyncExternalStore(introStore.subscribe, introStore.get, () => false);

/** "Start a project" drawer. */
export const projectDrawerStore = createStore(false);
export const useProjectDrawer = () =>
  useSyncExternalStore(projectDrawerStore.subscribe, projectDrawerStore.get, () => false);
export const openProjectDrawer = () => projectDrawerStore.set(true);
export const closeProjectDrawer = () => projectDrawerStore.set(false);

/** Smooth-scroll instance (Lenis) so any component can scrollTo. */
export const lenisStore = createStore<Lenis | null>(null);

export function scrollToTarget(target: string | number | HTMLElement, offset = 0) {
  const lenis = lenisStore.get();
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    return;
  }
  if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: "smooth" });
  }
}
