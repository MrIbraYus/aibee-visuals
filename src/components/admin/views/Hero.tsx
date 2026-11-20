"use client";

import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { useMemo, useState } from "react";
import { saveProjects } from "@/app/admin/actions";
import { heroItemsOf, newId, type Asset, type HeroItem, type Project } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { useAdmin } from "../AdminContext";
import { useUploader } from "../useUploader";
import { Button, Dropzone, EmptyState, Icon, inputCls, PageHeader, Thumb, UploadProgress } from "../ui";

type Key = string; // `${projectId}:${assetId}`
const keyOf = (i: HeroItem) => `${i.project.id}:${i.asset.id}`;

export function HeroView() {
  const { content, setContent, toast, canWrite, canUpload } = useAdmin();
  const initial = useMemo(() => heroItemsOf(content.projects), [content.projects]);
  const [items, setItems] = useState<HeroItem[]>(initial);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = items.map(keyOf).join() !== initial.map(keyOf).join();

  const save = async () => {
    setSaving(true);
    const order = new Map(items.map((i, n) => [keyOf(i), n]));
    const changed: Project[] = content.projects
      .map((p) => {
        let touched = false;
        const assets = p.assets.map((a) => {
          const n = order.get(`${p.id}:${a.id}`);
          const hero = n !== undefined;
          if (hero !== !!a.hero || (hero && a.heroOrder !== n)) {
            touched = true;
            return { ...a, hero, heroOrder: hero ? n : undefined };
          }
          return a;
        });
        return touched ? { ...p, assets, updatedAt: Date.now() } : null;
      })
      .filter(Boolean) as Project[];
    const res = await saveProjects(changed);
    setSaving(false);
    if (!res.ok) return toast(res.error, "error");
    setContent((c) => ({ ...c, projects: c.projects.map((p) => changed.find((x) => x.id === p.id) ?? p) }));
    toast("Hero updated");
  };

  return (
    <>
      <PageHeader
        title="Hero images"
        subtitle="These cards ride the arc at the top of the homepage. Drag to reorder — the first image starts nearest the centre. Portrait images (4:5) look best."
        actions={
          <>
            {dirty && (
              <Button tone="primary" onClick={save} disabled={saving || !canWrite}>
                {saving ? "Saving…" : "Save hero"}
              </Button>
            )}
            <Button tone="outline" onClick={() => setPicker(true)} disabled={!canWrite}>
              <Icon name="plus" /> Add images
            </Button>
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="The hero is empty"
          body="Add a few of your strongest images — 6 to 10 works best."
          action={
            <Button tone="primary" onClick={() => setPicker(true)}>
              <Icon name="plus" /> Add images
            </Button>
          }
        />
      ) : (
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
          {items.map((item, i) => (
            <HeroRow key={keyOf(item)} item={item} index={i} onRemove={() => setItems((list) => list.filter((x) => keyOf(x) !== keyOf(item)))} />
          ))}
        </Reorder.Group>
      )}

      <AnimatePresence>
        {picker && (
          <Picker
            selected={new Set(items.map(keyOf))}
            canUpload={canUpload && canWrite}
            onClose={() => setPicker(false)}
            onAdd={(added) => {
              setItems((list) => [...list, ...added]);
              setPicker(false);
            }}
          />
        )}
      </AnimatePresence>

      {dirty && (
        <div className="fixed inset-x-3 bottom-[76px] z-40 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-2 pl-4 shadow-2xl backdrop-blur-xl lg:hidden">
          <span className="text-[13px] text-muted">Unsaved order</span>
          <Button tone="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </>
  );
}

function HeroRow({ item, index, onRemove }: { item: HeroItem; index: number; onRemove: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 pr-3"
      whileDrag={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
    >
      <span onPointerDown={(e) => controls.start(e)} role="button" aria-label="Drag to reorder" className="grid size-9 cursor-grab touch-none place-items-center rounded-lg text-dim hover:bg-white/5">
        <Icon name="drag" />
      </span>
      <span className="w-6 text-center text-[13px] tabular-nums text-dim">{index + 1}</span>
      <span className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-ink">
        <Thumb media={item.asset.media} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{item.asset.title || "Untitled"}</span>
        <span className="block truncate text-[12px] text-muted">{item.project.client}</span>
      </span>
      <Button tone="danger" className="px-3" onClick={onRemove} aria-label="Remove from hero">
        <Icon name="close" />
        <span className="hidden sm:inline">Remove</span>
      </Button>
    </Reorder.Item>
  );
}

/** Choose existing images, or upload new ones into a project. */
function Picker({
  selected,
  canUpload,
  onClose,
  onAdd,
}: {
  selected: Set<Key>;
  canUpload: boolean;
  onClose: () => void;
  onAdd: (items: HeroItem[]) => void;
}) {
  const { content, setContent, toast } = useAdmin();
  const [chosen, setChosen] = useState<Set<Key>>(new Set());
  const [targetProject, setTargetProject] = useState(content.projects[0]?.id ?? "");
  const { jobs, upload, busy } = useUploader();
  const all = content.projects.flatMap((p) => p.assets.filter((a) => a.media.kind === "image").map((asset) => ({ asset, project: p })));
  const available = all.filter((i) => !selected.has(keyOf(i)));

  const toggle = (k: Key) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const onFiles = (files: File[]) => {
    const project = content.projects.find((p) => p.id === targetProject);
    if (!project) return toast("Choose a project first.", "error");
    const added: Asset[] = [];
    upload(
      files.filter((f) => f.type.startsWith("image/")),
      (media, file) => {
        const asset: Asset = { id: newId(), type: "design", media, title: file.name.replace(/\.[^.]+$/, ""), createdAt: Date.now() };
        added.push(asset);
        setContent((c) => ({
          ...c,
          projects: c.projects.map((p) => (p.id === project.id ? { ...p, assets: [...p.assets, asset] } : p)),
        }));
        setChosen((s) => new Set(s).add(`${project.id}:${asset.id}`));
      },
    ).then(async () => {
      if (!added.length) return;
      // Persist the new files to the project straight away.
      const latest = { ...project, assets: [...project.assets, ...added], updatedAt: Date.now() };
      const res = await saveProjects([latest]);
      if (!res.ok) toast(res.error, "error");
      else toast(`${added.length} image${added.length > 1 ? "s" : ""} added to ${project.client}`);
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Add hero images"
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        className="flex max-h-[92svh] w-full max-w-4xl flex-col rounded-t-3xl border border-line bg-surface sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-line p-4 sm:p-5">
          <h2 className="text-[18px] font-semibold">Add to hero</h2>
          <Button className="px-2.5" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {canUpload && (
            <div className="mb-6 rounded-2xl bg-ink/50 p-3">
              <label className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                Upload new images into
                <select className={cn(inputCls, "w-auto max-w-full py-1.5 text-[13px]")} value={targetProject} onChange={(e) => setTargetProject(e.target.value)}>
                  {content.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client}
                    </option>
                  ))}
                </select>
              </label>
              <Dropzone onFiles={onFiles} compact accept="image/*" label="Drop images here" hint="They'll be added to the project and selected below" />
              <UploadProgress jobs={jobs} />
            </div>
          )}
          {available.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-muted">Every image is already in the hero.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {available.map((i) => {
                const k = keyOf(i);
                const on = chosen.has(k);
                return (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => toggle(k)}
                      aria-pressed={on}
                      className={cn("relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-ink ring-2 transition", on ? "ring-lime" : "ring-transparent")}
                    >
                      <Thumb media={i.asset.media} />
                      <span className={cn("absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full", on ? "bg-lime text-ink" : "bg-black/50 text-white/60")}>
                        <Icon name="check" className="size-3.5" />
                      </span>
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px]">
                        {i.project.client}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line p-4 sm:p-5">
          <span className="text-[13px] text-muted">{chosen.size} selected</span>
          <Button
            tone="primary"
            disabled={!chosen.size || busy}
            onClick={() => {
              const lookup = new Map<string, HeroItem>(
                content.projects.flatMap((p) => p.assets.map((asset): [string, HeroItem] => [`${p.id}:${asset.id}`, { asset, project: p }])),
              );
              onAdd([...chosen].map((k) => lookup.get(k)!).filter(Boolean));
            }}
          >
            Add {chosen.size || ""} to hero
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
