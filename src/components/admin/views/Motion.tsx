"use client";

import { useMemo, useState } from "react";
import { saveProjects } from "@/app/admin/actions";
import { motionItemsOf, motionKinds, newId, type Asset, type MotionKind, type Project } from "@/lib/content/types";
import { formatDuration } from "@/lib/admin/upload";
import { cn } from "@/lib/utils";
import { useAdmin } from "../AdminContext";
import { useUploader } from "../useUploader";
import { Button, Dropzone, EmptyState, Icon, inputCls, PageHeader, Thumb, Toggle, UploadProgress } from "../ui";

const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-m4v";

export function MotionView() {
  const { content, setContent, toast, confirm, canWrite, canUpload, go } = useAdmin();
  const [projects, setProjects] = useState<Project[]>(content.projects);
  const [kind, setKind] = useState<MotionKind | "all">("all");
  const [target, setTarget] = useState(
    content.projects.find((p) => p.category === "Motion")?.id ?? content.projects[0]?.id ?? "",
  );
  const [uploadKind, setUploadKind] = useState<MotionKind>("Logo animation");
  const [saving, setSaving] = useState(false);
  const { jobs, upload, busy } = useUploader();

  const items = useMemo(() => motionItemsOf(projects), [projects]);
  const shown = items.filter((i) => kind === "all" || (i.asset.motionKind ?? "Motion graphics") === kind);
  const changed = projects.filter((p) => JSON.stringify(p) !== JSON.stringify(content.projects.find((c) => c.id === p.id)));

  const patch = (projectId: string, assetId: string, value: Partial<Asset> | null) =>
    setProjects((list) =>
      list.map((p) =>
        p.id !== projectId
          ? p
          : { ...p, assets: value ? p.assets.map((a) => (a.id === assetId ? { ...a, ...value } : a)) : p.assets.filter((a) => a.id !== assetId) },
      ),
    );

  const onFiles = (files: File[]) => {
    if (!target) return toast("Create a project first, then add motion to it.", "error");
    upload(
      files.filter((f) => f.type.startsWith("video/")),
      (media, file) => {
        const asset: Asset = {
          id: newId(),
          type: "motion",
          media,
          motionKind: uploadKind,
          title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
          reel: true,
          createdAt: Date.now(),
        };
        setProjects((list) => list.map((p) => (p.id === target ? { ...p, assets: [...p.assets, asset] } : p)));
      },
    );
  };

  const save = async () => {
    setSaving(true);
    const res = await saveProjects(changed.map((p) => ({ ...p, updatedAt: Date.now() })));
    setSaving(false);
    if (!res.ok) return toast(res.error, "error");
    setContent((c) => ({ ...c, projects: c.projects.map((p) => projects.find((x) => x.id === p.id) ?? p) }));
    toast("Motion saved");
  };

  return (
    <>
      <PageHeader
        title="Motion"
        subtitle="Logo animations, motion graphics and videos. Each piece belongs to a brand's project; pieces marked “reel” are featured on the homepage. MP4 (H.264) plays everywhere."
        actions={
          <Button tone="primary" onClick={save} disabled={!changed.length || saving || busy || !canWrite}>
            {saving ? "Saving…" : busy ? "Uploading…" : "Save motion"}
          </Button>
        }
      />

      {canUpload && canWrite && (
        <div className="mb-8 rounded-3xl border border-line bg-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            Add
            <select className={cn(inputCls, "w-auto max-w-full py-1.5 text-[13px]")} value={uploadKind} onChange={(e) => setUploadKind(e.target.value as MotionKind)}>
              {motionKinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            to
            <select className={cn(inputCls, "w-auto max-w-full py-1.5 text-[13px]")} value={target} onChange={(e) => setTarget(e.target.value)}>
              {content.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client}
                </option>
              ))}
            </select>
          </div>
          <Dropzone onFiles={onFiles} accept={VIDEO_ACCEPT} label="Drop videos here" hint="MP4, WebM or MOV — a poster frame is grabbed automatically" compact />
          <UploadProgress jobs={jobs} />
        </div>
      )}

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {(["all", ...motionKinds] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px]",
              kind === k ? "border-lime bg-lime text-ink" : "border-line text-white/75 hover:border-white/40",
            )}
          >
            {k === "all" ? `All · ${items.length}` : k}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No motion here yet" body="Upload logo animations, motion graphics or videos above." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map(({ asset, project }) => (
            <li key={asset.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="relative aspect-video bg-black">
                <Thumb media={asset.media} fit="contain" />
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px]">{formatDuration(asset.media.duration) || "Video"}</span>
                {asset.reel && <span className="absolute left-2 top-2 rounded-full bg-magenta px-2 py-0.5 text-[11px]">Reel</span>}
              </div>
              <div className="space-y-3 p-3">
                <input
                  className={cn(inputCls, "py-2 text-[14px]")}
                  value={asset.title ?? ""}
                  placeholder="Title"
                  onChange={(e) => patch(project.id, asset.id, { title: e.target.value })}
                  aria-label="Title"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={cn(inputCls, "py-2 text-[13px]")}
                    value={asset.motionKind ?? "Motion graphics"}
                    onChange={(e) => patch(project.id, asset.id, { motionKind: e.target.value as MotionKind })}
                    aria-label="Motion type"
                  >
                    {motionKinds.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => go({ name: "project", id: project.id })}
                    className="truncate rounded-xl border border-line px-3 text-left text-[13px] text-white/80 hover:border-white/40"
                    title="Open project"
                  >
                    {project.client}
                  </button>
                </div>
                <div className="rounded-xl bg-white/[0.03] px-3 py-1">
                  <Toggle checked={!!asset.reel} onChange={(v) => patch(project.id, asset.id, { reel: v })} label="Feature in homepage reel" />
                </div>
                <div className="flex justify-end">
                  <Button
                    tone="danger"
                    className="px-3"
                    onClick={async () => {
                      const ok = await confirm({ title: "Delete this video?", body: "It's removed from the site and storage when you save.", action: "Delete", danger: true });
                      if (ok) patch(project.id, asset.id, null);
                    }}
                  >
                    <Icon name="trash" /> Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {changed.length > 0 && (
        <div className="fixed inset-x-3 bottom-[76px] z-40 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-2 pl-4 shadow-2xl backdrop-blur-xl lg:hidden">
          <span className="text-[13px] text-muted">Unsaved changes</span>
          <Button tone="primary" onClick={save} disabled={saving || busy}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </>
  );
}
