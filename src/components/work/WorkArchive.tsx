"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo, useState } from "react";
import { categories, type Category, type Project } from "@/lib/content/types";
import { ProjectCover } from "./ProjectCover";
import { ArrowUpRight } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

/** Filterable archive grid for /work. */
export function WorkArchive({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<Category | "All">("All");
  const used = useMemo(() => categories.filter((c) => projects.some((p) => p.category === c)), [projects]);
  const shown = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <LayoutGroup>
      <div role="tablist" aria-label="Filter projects" className="flex flex-wrap gap-2">
        {(["All", ...used] as const).map((c) => {
          const active = filter === c;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setFilter(c)}
              className={cn(
                "relative rounded-full border px-4 py-2.5 text-[14px] transition-colors duration-300",
                active ? "border-transparent text-ink" : "border-line text-white/80 hover:border-white/40 hover:text-white",
              )}
            >
              {active && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 rounded-full bg-lime"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{c}</span>
            </button>
          );
        })}
      </div>

      <motion.ul layout className="mt-12 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((project, i) => (
            <motion.li
              key={project.slug}
              layout
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease, delay: Math.min(i, 6) * 0.05 } }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.3 } }}
              className={cn(i % 3 === 1 && "lg:mt-16")}
            >
              <Link href={`/work/${project.slug}`} className="group block" data-cursor="Open">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-surface">
                  <div className="absolute inset-0 transition-[scale] duration-700 ease-expo group-hover:scale-[1.05]">
                    <ProjectCover project={project} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" priority={i < 3} />
                  </div>
                  <span className="absolute right-4 top-4 grid size-11 scale-75 place-items-center rounded-full bg-lime text-ink opacity-0 transition-all duration-500 ease-expo group-hover:scale-100 group-hover:opacity-100">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold">{project.client}</p>
                    <p className="serif-i mt-1 text-[24px] leading-[1.05] text-white/85">{project.title}</p>
                  </div>
                  <p className="shrink-0 text-[13px] text-muted">{project.category}</p>
                </div>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </LayoutGroup>
  );
}
