"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openProjectDrawer, useIntroDone, useProjectDrawer } from "@/lib/store";
import { whatsappUrl } from "@/lib/contact";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { cn } from "@/lib/utils";

const icon = {
  home: "M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z",
  work: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z",
  motion: "M8 5.5v13l11-6.5z",
};

function Glyph({ d, filled }: { d: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" aria-hidden>
      <path d={d} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.7} strokeLinejoin="round" />
    </svg>
  );
}

/** App-style bottom navigation for phones and tablets. */
export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const introDone = useIntroDone();
  const drawerOpen = useProjectDrawer();
  if (drawerOpen) return null;

  const tabs = [
    { href: "/", label: "Home", d: icon.home, active: pathname === "/" },
    { href: "/work", label: "Work", d: icon.work, active: pathname.startsWith("/work") },
    { href: "/motion", label: "Motion", d: icon.motion, active: pathname.startsWith("/motion"), filled: true },
  ];

  return (
    <nav
      aria-label="Quick navigation"
      className={cn(
        "pb-safe fixed inset-x-0 bottom-0 z-[55] border-t border-white/10 bg-ink/85 backdrop-blur-xl transition-transform duration-700 ease-expo lg:hidden",
        introDone ? "translate-y-0" : "translate-y-full",
      )}
    >
      <ul className="mx-auto grid h-[64px] max-w-md grid-cols-5 items-center px-2">
        {tabs.map((t) => (
          <li key={t.href} className="flex justify-center">
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={cn(
                "flex w-full flex-col items-center gap-1 py-1.5 text-[10.5px] font-medium transition-colors",
                t.active ? "text-lime" : "text-white/60 active:text-white",
              )}
            >
              <Glyph d={t.d} filled={t.filled} />
              {t.label}
            </Link>
          </li>
        ))}
        <li className="flex justify-center">
          <button
            type="button"
            onClick={openProjectDrawer}
            className="flex w-full flex-col items-center gap-1 py-1.5 text-[10.5px] font-medium text-white/60 active:text-white"
          >
            <span className="grid size-[22px] place-items-center rounded-full bg-lime text-ink">
              <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
            Start
          </button>
        </li>
        <li className="flex justify-center">
          <a
            href={whatsappUrl("Hi Aibee Visuals! I'd like to talk about a project.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full flex-col items-center gap-1 py-1.5 text-[10.5px] font-medium text-[#25d366]"
          >
            <WhatsAppIcon className="size-[22px]" />
            Chat
          </a>
        </li>
      </ul>
    </nav>
  );
}
