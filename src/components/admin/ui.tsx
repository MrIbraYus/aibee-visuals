"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Media } from "@/lib/content/types";
import { mediaThumb, videoSrc } from "@/lib/media/urls";
import { ACCEPT } from "@/lib/admin/upload";
import { cn } from "@/lib/utils";

/* ------------------------------- icons ------------------------------- */

const paths = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  folder: "M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z",
  star: "m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  badge: "M12 3 4 7v5c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V7z",
  play: "M8 5.5v13l11-6.5z",
  inbox: "M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6z",
  plus: "M12 5v14M5 12h14",
  trash: "M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M18 13l-6 6-6-6",
  left: "M15 18l-6-6 6-6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5H5V6h5",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  check: "m5 12.5 4.5 4.5L19 7.5",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9a1.5 1.5 0 1 0 0-.01",
  close: "M6 6l12 12M18 6 6 18",
  drag: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  menu: "M4 7h16M4 12h16M4 17h16",
  cover: "M4 5h16v14H4zM8 15l2.5-3 2 2.5L15 11l3 4",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c2.5 2.6 3.6 5.6 3.6 9s-1.1 6.4-3.6 9c-2.5-2.6-3.6-5.6-3.6-9S9.5 5.6 12 3z",
  quote: "M5 17.5c2.6-.6 4-2.6 4-5.5V7H5v5h3M14 17.5c2.6-.6 4-2.6 4-5.5V7h-4v5h3",
  bell: "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20a2 2 0 0 0 4 0",
  mail: "M3.5 6h17v12h-17zM4 7l8 6 8-6",
  whatsapp: "M4 20l1.3-4A8 8 0 1 1 8 18.8zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 0 1-2.8-2.8l.9-1-1-2z",
};

export function Icon({ name, className }: { name: keyof typeof paths; className?: string }) {
  const filled = name === "play";
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[18px] shrink-0", className)} aria-hidden>
      <path
        d={paths[name]}
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={name === "drag" ? 3 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------ controls ----------------------------- */

export function Button({
  children,
  tone = "ghost",
  className,
  ...rest
}: React.ComponentPropsWithoutRef<"button"> & { tone?: "primary" | "ghost" | "danger" | "outline" }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        tone === "primary" && "bg-lime text-ink hover:bg-[#c8ff2e]",
        tone === "ghost" && "text-white/80 hover:bg-white/[0.06] hover:text-white",
        tone === "outline" && "border border-line text-white hover:border-white/40",
        tone === "danger" && "text-magenta hover:bg-magenta/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-1">
      <span>
        <span className="block text-[14px]">{label}</span>
        {hint && <span className="block text-[12px] text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-lime" : "bg-white/15")}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300",
            checked ? "translate-x-[22px] bg-ink" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && !error && <span className="mt-1.5 block text-[12px] text-dim">{hint}</span>}
      {error && <span className="mt-1.5 block text-[12px] text-magenta">{error}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-ink/60 px-3.5 py-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-lime";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-3xl border border-line bg-surface p-4 sm:p-6", className)}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.5] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------- media ------------------------------ */

/** Thumbnail for any stored media; videos play on hover. */
export function Thumb({ media, className, fit = "cover" }: { media: Media; className?: string; fit?: "cover" | "contain" }) {
  const ref = useRef<HTMLVideoElement>(null);
  if (media.kind === "video") {
    return (
      <video
        ref={ref}
        src={videoSrc(media, 800)}
        poster={mediaThumb(media, 600)}
        muted
        loop
        playsInline
        preload="metadata"
        onMouseEnter={() => ref.current?.play().catch(() => {})}
        onMouseLeave={() => ref.current?.pause()}
        className={cn("size-full bg-black", fit === "cover" ? "object-cover" : "object-contain", className)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaThumb(media, 600)}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain", className)}
    />
  );
}

export type UploadJob = { id: string; name: string; progress: number; error?: string };

/** Drag-and-drop / click-to-browse file picker. */
export function Dropzone({
  onFiles,
  disabled,
  accept = ACCEPT,
  label = "Drop images or videos here",
  hint = "JPG, PNG, WebP, SVG, GIF, MP4, WebM or MOV",
  compact,
  multiple = true,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
  label?: string;
  hint?: string;
  compact?: boolean;
  multiple?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "relative grid place-items-center rounded-2xl border-2 border-dashed text-center transition-colors",
        compact ? "px-4 py-6" : "px-6 py-10",
        over ? "border-lime bg-lime/5" : "border-line hover:border-white/30",
        disabled && "opacity-50",
      )}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <span className="grid size-11 place-items-center rounded-full bg-white/[0.06] text-lime">
        <Icon name="upload" />
      </span>
      <p className="mt-3 text-[15px] font-medium">{label}</p>
      <p className="mt-1 text-[12px] text-muted">{hint}</p>
      <Button tone="outline" className="mt-4" disabled={disabled} onClick={() => input.current?.click()}>
        Browse files
      </Button>
    </div>
  );
}

export function UploadProgress({ jobs }: { jobs: UploadJob[] }) {
  if (!jobs.length) return null;
  return (
    <ul className="mt-4 space-y-2">
      {jobs.map((j) => (
        <li key={j.id} className="rounded-xl bg-ink/60 px-3 py-2 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">{j.name}</span>
            <span className={j.error ? "text-magenta" : "text-muted"}>{j.error ? "Failed" : `${Math.round(j.progress * 100)}%`}</span>
          </div>
          {j.error ? (
            <p className="mt-1 text-[12px] text-magenta">{j.error}</p>
          ) : (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime transition-[width] duration-200" style={{ width: `${j.progress * 100}%` }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
      <p className="text-[18px] font-semibold">{title}</p>
      {body && <p className="mt-2 max-w-[44ch] text-[14px] text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
