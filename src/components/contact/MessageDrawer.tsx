"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { closeMessage, lenisStore, messageDrawerStore, useMessageDrawer } from "@/lib/store";
import { LogoMark } from "@/components/brand/Logo";
import { MessageForm } from "./MessageForm";

const ease = [0.16, 1, 0.3, 1] as const;

/** "Send a message" panel — opened from buttons across the site. */
export function MessageDrawer() {
  const { open, topic } = useMessageDrawer();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const lenis = lenisStore.get();
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMessage();
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true }), 500);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="message-title">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={closeMessage}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            ref={panelRef}
            data-lenis-prevent
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.8, ease }}
            className="absolute inset-x-0 bottom-0 max-h-[92svh] overflow-y-auto rounded-t-[28px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:bottom-3 sm:right-3 sm:max-h-[calc(100svh-24px)] sm:w-[560px] sm:rounded-[28px] sm:border"
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden />
            <div className="flex items-center justify-between px-6 pt-4 sm:px-9 sm:pt-8">
              <LogoMark className="size-9" />
              <button
                type="button"
                onClick={closeMessage}
                className="grid size-11 place-items-center rounded-full border border-line transition-colors hover:bg-white hover:text-ink"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-8 pt-6 sm:px-9 sm:pb-10 sm:pt-10">
              <h2 id="message-title" className="text-[clamp(32px,4vw,44px)] font-semibold leading-[1.02] tracking-[-0.04em]">
                Say hello<span className="serif-i font-normal">, we&apos;re listening.</span>
              </h2>
              <p className="mb-7 mt-3 max-w-[44ch] text-[15px] leading-[1.55] text-muted">
                Send a quick message and we&apos;ll get back to you, or chat with us directly on WhatsApp.
              </p>
              <MessageForm topic={topic} onClearTopic={() => messageDrawerStore.set({ open: true })} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
