"use client";

import { Reorder, useDragControls } from "motion/react";
import { useState } from "react";
import { saveProjects } from "@/app/admin/actions";
import { assetTypeLabels, assetTypes, coverOf, type Project } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { useAdmin } from "../AdminContext";
import { Button, EmptyState, Icon, PageHeader, Thumb } from "../ui";

export function ProjectsView() {
  const { content, setContent, go, toast, canWrite } = useAdmin();
  const sorted = content.projects.slice().sort((a, b) => a.order - b.order);
  const [order, setOrder] = useState<Project[]>(sorted);
  const [saving, setSaving] = useState(false);
  const dirty = order.map((p) => p.id).join() !== sorted.map((p) => p.id).join();

  const saveOrder = async () => {
    setSaving(true);
    const updated = order.map((p, i) => ({ ...p, order: i }));
    const res = await saveProjects(updated);
    setSaving(false);
    if (!res.ok) return toast(res.error, "error");
    setContent((c) => ({ ...c, projects: c.projects.map((p) => updated.find((u) => u.id === p.id) ?? p) }));
    toast("Project order saved");
  };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="One project per brand. Open a project to upload its designs, logos, illustrations and motion. Drag to change the order they appear on the site."
        actions={
          <>
            {dirty && (
              <Button tone="outline" onClick={saveOrder} disabled={saving || !canWrite}>
                {saving ? "Saving…" : "Save order"}
              </Button>
            )}
            <Button tone="primary" onClick={() => go({ name: "project", id: "new" })} disabled={!canWrite}>
              <Icon name="plus" /> New project
            </Button>
          </>
        }
      />

      {order.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Create a project for each brand you've worked with, then upload the work."
          action={
            <Button tone="primary" onClick={() => go({ name: "project", id: "new" })}>
              <Icon name="plus" /> New project
            </Button>
          }
        />
      ) : (
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
          {order.map((p) => (
            <ProjectRow key={p.id} project={p} onOpen={() => go({ name: "project", id: p.id })} />
          ))}
        </Reorder.Group>
      )}
    </>
  );
}

function ProjectRow({ project: p, onOpen }: { project: Project; onOpen: () => void }) {
  const controls = useDragControls();
  const cover = coverOf(p);
  const counts = assetTypes.map((t) => [t, p.assets.filter((a) => a.type === t).length] as const).filter(([, n]) => n > 0);
  return (
    <Reorder.Item
      value={p}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 pr-3 sm:gap-4 sm:p-3"
      whileDrag={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
    >
      <span
        onPointerDown={(e) => controls.start(e)}
        className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-dim hover:bg-white/5 active:cursor-grabbing"
        aria-label="Drag to reorder"
        role="button"
      >
        <Icon name="drag" />
      </span>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4">
        <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-ink sm:size-20">{cover && <Thumb media={cover.media} />}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold sm:text-[16px]">{p.client}</span>
            {!p.published && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-muted">Hidden</span>}
            {p.featured && <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[11px] text-lime">Featured</span>}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-muted">{p.title}</span>
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-dim">
            <span>{p.category}</span>
            {counts.map(([t, n]) => (
              <span key={t}>
                {n} {assetTypeLabels[t].toLowerCase()}
              </span>
            ))}
            {p.assets.length === 0 && <span className={cn("text-magenta")}>No files yet</span>}
          </span>
        </span>
      </button>
      <Button tone="ghost" className="hidden shrink-0 px-3 sm:inline-flex" onClick={onOpen} aria-label={`Edit ${p.client}`}>
        Edit
      </Button>
    </Reorder.Item>
  );
}
