"use client";

import Link from "next/link";
import { useState } from "react";
import { motionKinds, type MotionItem, type MotionKind } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { Lightbox } from "@/components/media/Lightbox";
import { VideoCard } from "@/components/media/VideoCard";

const kindOf = (i: MotionItem) => (i.asset.motionKind ?? "Motion graphics") as MotionKind;

/** /motion — every motion piece, filterable, opening in the viewer. */
export function MotionLibrary({ items }: { items: MotionItem[] }) {
  const [kind, setKind] = useState<MotionKind | "All">("All");
  const [open, setOpen] = useState<number | null>(null);
  const kinds = motionKinds.filter((k) => items.some((i) => kindOf(i) === k));
  const shown = kind === "All" ? items : items.filter((i) => kindOf(i) === kind);

  if (!items.length) {
    return <p className="mt-16 text-[17px] text-muted">Motion work is on its way — check back soon.</p>;
  }

  return (
    <>
      {kinds.length > 1 && (
        <div className="no-scrollbar mt-12 flex gap-2 overflow-x-auto" role="tablist" aria-label="Filter motion">
          {(["All", ...kinds] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2.5 text-[14px] transition-colors",
                kind === k ? "border-lime bg-lime text-ink" : "border-line text-white/80 hover:border-white/40",
              )}
            >
              {k === "All" ? "All" : `${k}s`}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item, i) => {
          return (
            <li key={item.asset.id}>
              <VideoCard
                media={item.asset.media}
                onOpen={() => setOpen(i)}
                label={item.asset.title}
                className="aspect-video rounded-2xl"
                width={960}
              />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-medium">{item.asset.title}</p>
                  <Link href={`/work/${item.project.slug}`} className="text-[13px] text-muted hover:text-white">
                    {item.project.client}
                  </Link>
                </div>
                <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[12px] text-white/80">{kindOf(item)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <Lightbox
        items={shown.map((i) => ({ media: i.asset.media, title: i.asset.title, subtitle: `${i.project.client} · ${kindOf(i)}` }))}
        index={open}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
