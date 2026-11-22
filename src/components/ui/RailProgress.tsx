import { cn } from "@/lib/utils";

/** Thin progress line with a "Swipe" hint, shown under a swipeable row. */
export function RailProgress({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-white/12">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-lime transition-[width] duration-150"
          style={{ width: `${Math.max(12, progress * 100)}%` }}
        />
      </div>
      <span className="flex items-center gap-1.5 text-[12px] text-muted lg:hidden">
        Swipe
        <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}
