"use client";

import { AnimatePresence, motion } from "motion/react";
import { whatsappUrl } from "@/lib/contact";
import { useIntroDone, useProjectDrawer } from "@/lib/store";
import { WhatsAppIcon } from "./WhatsAppIcon";

/** Floating "Chat on WhatsApp" — always one tap away. */
export function WhatsAppButton() {
  const introDone = useIntroDone();
  const drawerOpen = useProjectDrawer();
  const show = introDone && !drawerOpen;

  return (
    <AnimatePresence>
      {show && (
        <motion.a
          key="wa"
          href={whatsappUrl("Hi Aibee Visuals! I'd like to talk about a project.")}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with Aibee Visuals on WhatsApp"
          data-cursor="Chat"
          initial={{ scale: 0, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1.2 }}
          className="group fixed bottom-4 right-4 z-[60] flex h-14 items-center gap-0 overflow-hidden rounded-full bg-[#25d366] pl-4 pr-4 text-[#06210f] shadow-[0_12px_40px_rgba(37,211,102,0.35)] transition-[gap,padding] duration-500 ease-expo hover:gap-2.5 hover:pr-5 sm:bottom-6 sm:right-6"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-[#25d366] opacity-20 [animation-duration:2.4s]" aria-hidden />
          <WhatsAppIcon className="relative size-6 shrink-0" />
          <span className="relative max-w-0 overflow-hidden whitespace-nowrap text-[14px] font-semibold transition-[max-width] duration-500 ease-expo group-hover:max-w-[160px]">
            Chat on WhatsApp
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
