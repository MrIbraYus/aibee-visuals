import { LOGOMARK_PATH, LOGOMARK_VIEWBOX } from "@/lib/logomark";
import { cn } from "@/lib/utils";

type MarkProps = { className?: string; color?: string; title?: string };

export function LogoMark({ className, color = "#115DEF", title }: MarkProps) {
  const { width, height } = LOGOMARK_VIEWBOX;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g transform={`translate(0 ${height}) scale(1 -1)`}>
        <path d={LOGOMARK_PATH} fill={color} />
      </g>
    </svg>
  );
}

type LogoProps = { className?: string; markClassName?: string; tone?: "light" | "dark" };

/** Full lockup: logomark + "Aibee Visuals" wordmark (Montserrat). */
export function Logo({ className, markClassName, tone = "light" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-[7px] select-none", className)}>
      <LogoMark className={cn("size-[34px] shrink-0 sm:size-[39px]", markClassName)} />
      <span
        className={cn(
          "font-logo text-[20px] leading-none sm:text-[22.78px]",
          tone === "light" ? "text-white" : "text-ink",
        )}
      >
        <span className="font-extrabold">Aibee </span>
        <span className="font-normal tracking-[-0.05em]">Visuals</span>
      </span>
    </span>
  );
}
