"use client";

import Image from "next/image";
import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { assetTypeLabels, assetTypes, type Asset, type AssetType, type Project } from "@/lib/content/types";
import { aspectOf, imageProps } from "@/lib/media/urls";
import { cn } from "@/lib/utils";
import { Lightbox } from "@/components/media/Lightbox";
import { VideoCard } from "@/components/media/VideoCard";

/** Every file made for a brand, grouped into Designs / Logos / Illustrations / Motion. */
export function ProjectGallery({ project }: { project: Project }) {
  const groups = assetTypes.filter((t) => project.assets.some((a) => a.type === t));
  const [tab, setTab] = useState<AssetType | "all">("all");
  const [open, setOpen] = useState<number | null>(null);
  const shown = tab === "all" ? project.assets : project.assets.filter((a) => a.type === tab);

  if (!project.assets.length) return null;

  const lightboxItems = shown.map((a) => ({
    media: a.media,
    title: a.title ?? project.title,
    subtitle: `${project.client} · ${assetTypeLabels[a.type]}`,
  }));

  return (
    <div>
      {groups.length > 1 && (
        <LayoutGroup id="project-tabs">
          <div
            role="tablist"
            aria-label="Filter work"
            className="no-scrollbar sticky top-[76px] z-20 -mx-[var(--gutter)] mb-6 flex gap-1 overflow-x-auto bg-ink/85 px-[var(--gutter)] py-3 backdrop-blur-xl sm:top-[104px] lg:mx-0 lg:rounded-full lg:border lg:border-line lg:p-1.5"
          >
            {(["all", ...groups] as const).map((t) => {
              const count = t === "all" ? project.assets.length : project.assets.filter((a) => a.type === t).length;
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t)}
                  className={cn("relative shrink-0 rounded-full px-4 py-2 text-[14px] transition-colors", active ? "text-ink" : "text-white/75 hover:text-white")}
                >
                  {active && <motion.span layoutId="project-tab" className="absolute inset-0 rounded-full bg-lime" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className="relative">
                    {t === "all" ? "Everything" : assetTypeLabels[t]} <span className={active ? "text-ink/60" : "text-white/40"}>{count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      )}

      <ul className={cn("gap-5", tab === "logo" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" : "columns-1 sm:columns-2 lg:columns-3")}>
        {shown.map((asset, i) => (
          <motion.li
            key={asset.id}
            layout="position"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={cn("break-inside-avoid", tab !== "logo" && "mb-5")}
          >
            <Tile asset={asset} project={project} onOpen={() => setOpen(i)} priority={i < 2} />
          </motion.li>
        ))}
      </ul>

      <Lightbox items={lightboxItems} index={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Tile({ asset, project, onOpen, priority }: { asset: Asset; project: Project; onOpen: () => void; priority?: boolean }) {
  const ratio = aspectOf(asset.media);
  if (asset.media.kind === "video") {
    return (
      <figure>
        <div className="overflow-hidden rounded-[20px]" style={{ aspectRatio: ratio }}>
          <VideoCard media={asset.media} onOpen={onOpen} label={asset.title} className="size-full" width={1280} />
        </div>
        {asset.title && <figcaption className="mt-2.5 px-1 text-[13px] text-muted">{asset.title}</figcaption>}
      </figure>
    );
  }
  const logo = asset.type === "logo";
  return (
    <figure>
      <button
        type="button"
        onClick={onOpen}
        data-cursor="View"
        aria-label={`View ${asset.title ?? "image"} full screen`}
        className={cn(
          "group relative block w-full overflow-hidden rounded-[20px]",
          logo ? "aspect-square bg-cream p-[12%]" : "bg-surface",
        )}
        style={logo ? undefined : { aspectRatio: ratio }}
      >
        <span className={cn("relative block size-full", !logo && "absolute inset-0")}>
          <Image
            {...imageProps(asset.media.url)}
            alt={`${project.client} — ${asset.title ?? project.title}`}
            fill
            preload={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={cn("transition-transform duration-700 ease-expo group-hover:scale-[1.03]", logo ? "object-contain" : "object-cover")}
          />
        </span>
      </button>
      {asset.title && <figcaption className="mt-2.5 px-1 text-[13px] text-muted">{asset.title}</figcaption>}
    </figure>
  );
}
