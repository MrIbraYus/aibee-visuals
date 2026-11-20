"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteProject, discardMedia, saveProject } from "@/app/admin/actions";
import {
  assetTypeLabels,
  assetTypes,
  categories,
  coverOf,
  motionKinds,
  newId,
  slugify,
  type Asset,
  type AssetType,
  type Media,
  type MotionKind,
  type Project,
} from "@/lib/content/types";
import { formatBytes, formatDuration } from "@/lib/admin/upload";
import { cn } from "@/lib/utils";
import { useAdmin } from "../AdminContext";
import { useUploader } from "../useUploader";
import { Button, Dropzone, EmptyState, Field, Icon, inputCls, Panel, Thumb, Toggle, UploadProgress } from "../ui";

const emptyProject = (order: number): Project => ({
  id: newId(),
  slug: "",
  client: "",
  title: "",
  category: "Brand Identity",
  year: String(new Date().getFullYear()),
  summary: "",
  services: [],
  accent: "#b7f500",
  featured: false,
  published: true,
  order,
  assets: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

type UploadAs = "auto" | AssetType;

export function ProjectEditor({ id }: { id: string }) {
  const { content, setContent, go, toast, confirm, canWrite, canUpload } = useAdmin();
  const original = content.projects.find((p) => p.id === id);
  const isNew = id === "new" || !original;
  const [draft, setDraft] = useState<Project>(() => original ?? emptyProject(content.projects.length));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<AssetType | "all">("all");
  const [uploadAs, setUploadAs] = useState<UploadAs>("auto");
  const [serviceInput, setServiceInput] = useState("");
  const freshUploads = useRef<Media[]>([]);
  const { jobs, upload, busy } = useUploader();

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(original ?? null), [draft, original]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = <K extends keyof Project>(key: K, value: Project[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const setClientOrTitle = (key: "client" | "title", value: string) =>
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (!slugTouched) next.slug = slugify(next.client || next.title);
      return next;
    });

  const updateAsset = (assetId: string, patch: Partial<Asset>) =>
    setDraft((d) => ({ ...d, assets: d.assets.map((a) => (a.id === assetId ? { ...a, ...patch } : a)) }));

  const moveAsset = (assetId: string, dir: -1 | 1) =>
    setDraft((d) => {
      const list = [...d.assets];
      const i = list.findIndex((a) => a.id === assetId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, assets: list };
    });

  const removeAsset = async (asset: Asset) => {
    const ok = await confirm({
      title: "Remove this file?",
      body: "It will be deleted from the project and from storage when you save.",
      action: "Remove",
      danger: true,
    });
    if (!ok) return;
    setDraft((d) => ({ ...d, assets: d.assets.filter((a) => a.id !== asset.id), coverId: d.coverId === asset.id ? undefined : d.coverId }));
  };

  const onFiles = (files: File[]) =>
    upload(files, (media, file) => {
      freshUploads.current.push(media);
      const isVideo = media.kind === "video";
      const type: AssetType = uploadAs !== "auto" ? uploadAs : isVideo ? "motion" : "design";
      const asset: Asset = {
        id: newId(),
        type: isVideo && type !== "motion" ? "motion" : type,
        media,
        title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 140),
        motionKind: isVideo ? "Motion graphics" : undefined,
        createdAt: Date.now(),
      };
      setDraft((d) => ({ ...d, assets: [...d.assets, asset] }));
    });

  const save = async () => {
    setSaving(true);
    const res = await saveProject({ ...draft, slug: draft.slug || slugify(draft.client || draft.title) });
    setSaving(false);
    if (!res.ok) return toast(res.error, "error");
    freshUploads.current = [];
    setContent((c) => {
      const exists = c.projects.some((p) => p.id === res.data.id);
      return { ...c, projects: exists ? c.projects.map((p) => (p.id === res.data.id ? res.data : p)) : [...c.projects, res.data] };
    });
    setDraft(res.data);
    toast(isNew ? "Project created — it's live on the site" : "Changes saved");
    if (isNew) go({ name: "project", id: res.data.id });
  };

  const discard = async () => {
    if (dirty) {
      const ok = await confirm({ title: "Discard changes?", body: "Uploads you haven't saved will be removed.", action: "Discard", danger: true });
      if (!ok) return;
    }
    await Promise.all(freshUploads.current.map((m) => discardMedia(m)));
    freshUploads.current = [];
    go({ name: "projects" });
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${draft.client || "this project"}?`,
      body: `This removes the project page and all ${draft.assets.length} files. This can't be undone.`,
      action: "Delete project",
      danger: true,
    });
    if (!ok) return;
    const res = await deleteProject(draft.id);
    if (!res.ok) return toast(res.error, "error");
    setContent((c) => ({ ...c, projects: c.projects.filter((p) => p.id !== draft.id) }));
    toast("Project deleted");
    go({ name: "projects" });
  };

  const addService = () => {
    const v = serviceInput.trim();
    if (!v || draft.services.includes(v)) return setServiceInput("");
    set("services", [...draft.services, v].slice(0, 12));
    setServiceInput("");
  };

  const cover = coverOf(draft);
  const shown = draft.assets.filter((a) => filter === "all" || a.type === filter);
  const typeCounts = Object.fromEntries(assetTypes.map((t) => [t, draft.assets.filter((a) => a.type === t).length])) as Record<AssetType, number>;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button className="-ml-3" onClick={discard}>
          <Icon name="left" /> Projects
        </Button>
        <div className="flex items-center gap-2">
          {!isNew && draft.published && (
            <Link
              href={`/work/${original?.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] text-white/80 hover:bg-white/[0.06]"
            >
              <Icon name="external" /> <span className="hidden sm:inline">View live</span>
            </Link>
          )}
          <Button tone="primary" onClick={save} disabled={!dirty || saving || busy || !canWrite}>
            {saving ? "Saving…" : busy ? "Uploading…" : isNew ? "Create project" : "Save changes"}
          </Button>
        </div>
      </div>

      <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[40px]">
        {draft.client || (isNew ? "New project" : "Untitled")}
        {draft.title && <span className="serif-i block text-[0.7em] font-normal text-white/60">{draft.title}</span>}
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Details */}
        <Panel>
          <h2 className="text-[16px] font-semibold">Details</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Brand / client">
              <input className={inputCls} value={draft.client} onChange={(e) => setClientOrTitle("client", e.target.value)} placeholder="e.g. CampusRide" />
            </Field>
            <Field label="Project title">
              <input className={inputCls} value={draft.title} onChange={(e) => setClientOrTitle("title", e.target.value)} placeholder="e.g. Ride together." />
            </Field>
            <Field label="Category">
              <select className={inputCls} value={draft.category} onChange={(e) => set("category", e.target.value as Project["category"])}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Year">
              <input className={inputCls} value={draft.year} onChange={(e) => set("year", e.target.value)} inputMode="numeric" maxLength={10} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Summary" hint="One or two sentences shown on cards and at the top of the project page.">
                <textarea
                  className={cn(inputCls, "min-h-[96px] resize-y")}
                  value={draft.summary}
                  maxLength={600}
                  onChange={(e) => set("summary", e.target.value)}
                  placeholder="What did you make, and why does it work?"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Services">
                <div className="flex flex-wrap gap-2">
                  {draft.services.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-line py-1.5 pl-3 pr-1.5 text-[13px]">
                      {s}
                      <button
                        type="button"
                        aria-label={`Remove ${s}`}
                        onClick={() => set("services", draft.services.filter((x) => x !== s))}
                        className="grid size-5 place-items-center rounded-full hover:bg-white/10"
                      >
                        <Icon name="close" className="size-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    className="min-w-[140px] flex-1 rounded-full border border-dashed border-line bg-transparent px-3 py-1.5 text-[13px] outline-none focus:border-lime"
                    placeholder="Add a service, press Enter"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addService();
                      }
                    }}
                    onBlur={addService}
                  />
                </div>
              </Field>
            </div>
          </div>
        </Panel>

        {/* Settings */}
        <div className="space-y-6">
          <Panel>
            <h2 className="text-[16px] font-semibold">Visibility</h2>
            <div className="mt-3 divide-y divide-line">
              <div className="py-2.5">
                <Toggle checked={draft.published} onChange={(v) => set("published", v)} label="Show on website" hint="Hidden projects stay in the dashboard only." />
              </div>
              <div className="py-2.5">
                <Toggle checked={draft.featured} onChange={(v) => set("featured", v)} label="Featured" hint="Appears in the homepage Selected Work grid." />
              </div>
            </div>
          </Panel>
          <Panel>
            <h2 className="text-[16px] font-semibold">Page</h2>
            <div className="mt-4 space-y-4">
              <Field label="Link" hint={`aibeevisuals.com/work/${draft.slug || "…"}`}>
                <input
                  className={inputCls}
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                />
              </Field>
              <Field label="Accent colour">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.accent ?? "#b7f500"}
                    onChange={(e) => set("accent", e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-transparent"
                    aria-label="Accent colour"
                  />
                  <span className="text-[13px] text-muted">{draft.accent}</span>
                </div>
              </Field>
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Cover</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="size-16 overflow-hidden rounded-xl bg-ink">{cover && <Thumb media={cover.media} />}</span>
                  <span className="text-[12px] text-dim">Use the cover button on any image below.</span>
                </div>
              </div>
            </div>
          </Panel>
          {!isNew && (
            <Panel className="border-magenta/30">
              <h2 className="text-[16px] font-semibold">Danger zone</h2>
              <p className="mt-1 text-[13px] text-muted">Delete the project, its page and all of its files.</p>
              <Button tone="danger" className="-ml-3 mt-2" onClick={remove} disabled={!canWrite}>
                <Icon name="trash" /> Delete project
              </Button>
            </Panel>
          )}
        </div>
      </div>

      {/* Files */}
      <Panel className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold">Files</h2>
            <p className="mt-1 text-[13px] text-muted">
              Everything visitors see on this brand&apos;s page — designs, logos, illustrations and motion.
            </p>
          </div>
          <label className="flex w-full flex-col gap-1.5 text-[13px] text-muted sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            Upload as
            <select className={cn(inputCls, "w-full py-2 text-[13px] sm:w-auto")} value={uploadAs} onChange={(e) => setUploadAs(e.target.value as UploadAs)}>
              <option value="auto">Auto — images as designs, videos as motion</option>
              {assetTypes.map((t) => (
                <option key={t} value={t}>
                  {assetTypeLabels[t]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <Dropzone onFiles={onFiles} disabled={!canUpload || !canWrite} compact={draft.assets.length > 0} />
          <UploadProgress jobs={jobs} />
        </div>

        {draft.assets.length > 0 && (
          <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
            {(["all", ...assetTypes] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                  filter === t ? "border-lime bg-lime text-ink" : "border-line text-white/75 hover:border-white/40",
                )}
              >
                {t === "all" ? `All · ${draft.assets.length}` : `${assetTypeLabels[t]} · ${typeCounts[t]}`}
              </button>
            ))}
          </div>
        )}

        {draft.assets.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No files yet" body="Upload the work you made for this brand. You can sort each file into designs, logos, illustrations or motion." />
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isCover={cover?.id === asset.id}
                onChange={(patch) => updateAsset(asset.id, patch)}
                onMove={(dir) => moveAsset(asset.id, dir)}
                onCover={() => set("coverId", asset.id)}
                onRemove={() => removeAsset(asset)}
              />
            ))}
          </ul>
        )}
      </Panel>

      {/* Mobile save bar */}
      {dirty && (
        <div className="fixed inset-x-3 bottom-[76px] z-40 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-2 pl-4 shadow-2xl backdrop-blur-xl lg:hidden">
          <span className="text-[13px] text-muted">Unsaved changes</span>
          <Button tone="primary" onClick={save} disabled={saving || busy || !canWrite}>
            {saving ? "Saving…" : busy ? "Uploading…" : "Save"}
          </Button>
        </div>
      )}
    </>
  );
}

function AssetCard({
  asset,
  isCover,
  onChange,
  onMove,
  onCover,
  onRemove,
}: {
  asset: Asset;
  isCover: boolean;
  onChange: (patch: Partial<Asset>) => void;
  onMove: (dir: -1 | 1) => void;
  onCover: () => void;
  onRemove: () => void;
}) {
  const video = asset.media.kind === "video";
  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-ink/50">
      <div className={cn("relative aspect-[4/3]", asset.type === "logo" ? "bg-[#f3f0e8]" : "bg-black")}>
        <Thumb media={asset.media} fit={asset.type === "logo" ? "contain" : "cover"} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {isCover && <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-medium text-ink">Cover</span>}
          {asset.hero && <span className="rounded-full bg-blue px-2 py-0.5 text-[11px] text-white">Hero</span>}
          {asset.reel && <span className="rounded-full bg-magenta px-2 py-0.5 text-[11px] text-white">Reel</span>}
        </div>
        <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white/85">
          {video ? formatDuration(asset.media.duration) || "Video" : asset.media.width ? `${asset.media.width}×${asset.media.height}` : ""}
          {asset.media.bytes ? ` · ${formatBytes(asset.media.bytes)}` : ""}
        </span>
      </div>
      <div className="space-y-3 p-3">
        <input
          className={cn(inputCls, "py-2 text-[14px]")}
          value={asset.title ?? ""}
          placeholder="Caption (optional)"
          maxLength={140}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-label="Caption"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className={cn(inputCls, "py-2 text-[13px]")}
            value={asset.type}
            aria-label="File type"
            onChange={(e) => {
              const type = e.target.value as AssetType;
              onChange({ type, ...(type !== "motion" ? { reel: false } : {}) });
            }}
          >
            {assetTypes
              .filter((t) => (video ? t === "motion" : t !== "motion" || video))
              .map((t) => (
                <option key={t} value={t}>
                  {assetTypeLabels[t]}
                </option>
              ))}
          </select>
          {video ? (
            <select
              className={cn(inputCls, "py-2 text-[13px]")}
              value={asset.motionKind ?? "Motion graphics"}
              aria-label="Motion type"
              onChange={(e) => onChange({ motionKind: e.target.value as MotionKind })}
            >
              {motionKinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={onCover}
              disabled={isCover}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line text-[13px] text-white/80 transition-colors hover:border-white/40 disabled:border-lime/40 disabled:text-lime"
            >
              <Icon name="cover" className="size-4" /> {isCover ? "Cover" : "Set cover"}
            </button>
          )}
        </div>
        <div className="rounded-xl bg-white/[0.03] px-3 py-1">
          {video ? (
            <Toggle checked={!!asset.reel} onChange={(v) => onChange({ reel: v })} label="Feature in motion reel" />
          ) : (
            <Toggle checked={!!asset.hero} onChange={(v) => onChange({ hero: v, heroOrder: v ? (asset.heroOrder ?? Date.now()) : asset.heroOrder })} label="Show in hero" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex">
            <Button className="px-2.5" onClick={() => onMove(-1)} aria-label="Move earlier">
              <Icon name="up" className="-rotate-90" />
            </Button>
            <Button className="px-2.5" onClick={() => onMove(1)} aria-label="Move later">
              <Icon name="down" className="-rotate-90" />
            </Button>
          </div>
          <Button tone="danger" className="px-3" onClick={onRemove}>
            <Icon name="trash" /> Remove
          </Button>
        </div>
      </div>
    </li>
  );
}
