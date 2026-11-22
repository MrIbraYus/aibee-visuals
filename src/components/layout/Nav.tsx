"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { navLinks } from "@/content/site";
import { Logo } from "@/components/brand/Logo";
import { PillButton, RollText } from "@/components/ui/Primitives";
import { openMessage, useIntroDone } from "@/lib/store";
import { useSectionNav } from "@/lib/useSectionNav";
import { ScrollTrigger } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export function Nav() {
  const introDone = useIntroDone();
  const [active, setActive] = useState<string>("#home");
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const { go: goTo, onHome, pathname } = useSectionNav();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > 240 && y > prev && !open);
  });

  // Track which section sits under the middle of the viewport.
  useEffect(() => {
    if (!onHome) return;
    const triggers = navLinks
      .filter((link) => document.querySelector(link.href))
      .map((link) =>
        ScrollTrigger.create({
          trigger: link.href,
          start: "top center",
          end: "bottom center",
          // Measure after the pinned scenes so positions include their spacing.
          refreshPriority: -1,
          onToggle: (self) => self.isActive && setActive(link.href),
        }),
      );
    return () => triggers.forEach((t) => t.kill());
  }, [onHome]);

  const current = onHome ? active : pathname.startsWith("/work") ? "#work" : pathname.startsWith("/motion") ? "#motion" : "";

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    goTo(href);
  };

  return (
    <>
      <motion.header
        initial={{ y: -140, opacity: 0 }}
        animate={introDone ? { y: hidden ? -140 : 0, opacity: 1 } : { y: -140, opacity: 0 }}
        transition={{ duration: 0.9, ease, delay: introDone && !hidden ? 0.35 : 0 }}
        className="fixed inset-x-0 top-3 z-[57] px-3 sm:top-6 sm:px-[var(--gutter)]"
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 max-w-[1312px] items-center justify-between rounded-[22px] border border-line bg-surface/85 pl-4 pr-2 backdrop-blur-xl sm:h-20 sm:rounded-3xl sm:pl-6 sm:pr-[9px]"
        >
          <button type="button" onClick={() => go("#home")} aria-label="Aibee Visuals — home" className="shrink-0">
            <Logo />
          </button>

          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const isActive = current === link.href;
              return (
                <li key={link.href}>
                  <button
                    type="button"
                    onClick={() => go(link.href)}
                    className={cn(
                      "group relative px-3 py-2 text-sm leading-[1.6] transition-colors",
                      isActive ? "text-white" : "text-muted hover:text-white",
                    )}
                  >
                    <RollText>{link.label}</RollText>
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-lime"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <PillButton onClick={() => openMessage()} className="hidden rounded-[18px] sm:inline-flex" data-cursor="Say hi">
              Let&apos;s Talk
            </PillButton>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid size-12 place-items-center rounded-2xl bg-white/5 lg:hidden"
            >
              <span className="relative block h-3 w-5">
                <span
                  className={cn(
                    "absolute left-0 top-0 h-[2px] w-full rounded bg-white transition-transform duration-500 ease-expo",
                    open && "translate-y-[5px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-[2px] w-full rounded bg-white transition-transform duration-500 ease-expo",
                    open && "-translate-y-[5px] -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            key="menu"
            initial={{ clipPath: "circle(0% at calc(100% - 44px) 44px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 44px) 44px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 44px) 44px)" }}
            transition={{ duration: 0.8, ease }}
            className="fixed inset-0 z-[56] flex flex-col justify-between bg-ink px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-28 lg:hidden"
          >
            <ul className="flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <li key={link.href} className="overflow-hidden">
                  <motion.button
                    type="button"
                    onClick={() => go(link.href)}
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "110%" }}
                    transition={{ duration: 0.7, ease, delay: 0.15 + i * 0.05 }}
                    className="flex w-full items-baseline gap-4 py-1 text-left"
                  >
                    <span className={cn("serif-i text-[13vw] leading-[1.05]", current === link.href ? "text-lime" : "text-white")}>
                      {link.label}
                    </span>
                  </motion.button>
                </li>
              ))}
            </ul>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
            >
              <PillButton
                onClick={() => {
                  setOpen(false);
                  openMessage();
                }}
                className="w-full justify-between"
              >
                Send a message
              </PillButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
