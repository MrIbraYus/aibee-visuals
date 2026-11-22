"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo, useState } from "react";
import { categories, type Category, type Project, type Website } from "@/lib/content/types";
import { ProjectCover } from "./ProjectCover";
import { WebsiteCard } from "./WebsiteCard";
import { ArrowUpRight } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

type Filter = Category | "All" | "Websites";

/** Filterable archive for /work: projects, then the websites we've built. */
export function WorkArchive({ projects, websites }: { projects: Project[]; websites: Website[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const used = useMemo(() => categories.filter((c) => projects.some((p) => p.category === c)), [projects]);
  const shown = filter === "All" ? projects : filter === "Websites" ? [] : projects.filter((p) => p.category === filter);
  const tabs: Filter[] = ["All", ...(websites.length ? (["Websites"] as const) : []), ...used];
  const showSites = websites.length > 0 && (filter === "All" || filter === "Websites");

  return (
    <LayoutGroup>
      <div role="tablist" aria-label="Filter projects" className="flex flex-wrap gap-2">
        {tabs.map((c) => {
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
              <span className="relative">
                {c}
                {c === "Websites" && <span className={cn("ml-1.5 tabular-nums", active ? "text-ink/60" : "text-white/45")}>{websites.length}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <motion.ul layout className={cn("grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3", shown.length > 0 && "mt-12")}>
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

      <AnimatePresence>
        {showSites && (
          <motion.section
            key="websites"
            layout
            aria-labelledby="work-websites-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            className={filter === "All" ? "mt-[clamp(80px,9vw,140px)] border-t border-line pt-[clamp(48px,6vw,80px)]" : "mt-12"}
          >
            {filter === "All" && (
              <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <h2 id="work-websites-title" className="max-w-[16ch] text-[clamp(34px,4vw,60px)] font-semibold leading-[1] tracking-[-0.045em]">
                  Websites we&apos;ve designed <span className="serif-i font-normal">&amp; built.</span>
                </h2>
                <p className="max-w-[36ch] text-[15px] leading-[1.55] text-muted">Live sites you can visit, from first wireframe to launch day.</p>
              </div>
            )}
            <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2">
              {websites.map((site, i) => (
                <motion.li
                  key={site.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.8, ease, delay: Math.min(i % 2, 1) * 0.08 }}
                >
                  <WebsiteCard site={site} index={i} priority={filter === "Websites" && i < 2} />
                </motion.li>
              ))}
            </ul>
            {filter === "Websites" && <h2 id="work-websites-title" className="sr-only">Websites</h2>}
          </motion.section>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
