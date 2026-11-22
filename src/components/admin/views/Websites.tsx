"use client";

import { Reorder, useDragControls } from "motion/react";
import { useRef, useState } from "react";
import { saveWebsites } from "@/app/admin/actions";
import { newId, type Website } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { useAdmin } from "../AdminContext";
import { useUploader } from "../useUploader";
import { Button, EmptyState, Field, Icon, inputCls, PageHeader, Thumb, Toggle, UploadProgress } from "../ui";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

const sorted = (list: Website[]) => list.slice().sort((a, b) => a.order - b.order);
const withOrder = (list: Website[]) => list.map((w, i) => ({ ...w, order: i }));

/** Adds https:// when the address was typed without it. */
export const normalizeUrl = (v: string) => {
  const t = v.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

const validUrl = (v: string) => {
  try {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
};

export function WebsitesView() {
  const { content, setContent, toast, confirm, canWrite, canUpload } = useAdmin();
  const [sites, setSites] = useState<Website[]>(() => sorted(content.websites));
  const [saving, setSaving] = useState(false);
  const { jobs, upload, busy } = useUploader();
  const dirty = JSON.stringify(withOrder(sites)) !== JSON.stringify(withOrder(sorted(content.websites)));

  const update = (id: string, patch: Partial<Website>) => setSites((list) => list.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const add = () => {
    const id = newId();
    setSites((list) => [
      { id, name: "", url: "", description: "", tags: [], published: true, order: 0, createdAt: Date.now() },
      ...list,
    ]);
    window.setTimeout(() => document.getElementById(`site-${id}`)?.querySelector("input")?.focus(), 50);
  };

  const save = async () => {
    const cleaned = withOrder(sites).map((w) => ({ ...w, name: w.name.trim(), url: normalizeUrl(w.url), description: w.description.trim() }));
    const noName = cleaned.find((w) => !w.name);
    if (noName) return toast("Every website needs a name.", "error");
    const badUrl = cleaned.find((w) => !validUrl(w.url));
    if (badUrl) return toast(`Check the web address for ${badUrl.name} (e.g. https://example.com).`, "error");
    setSaving(true);
    const res = await saveWebsites(cleaned);
    setSaving(false);
    if (!res.ok) return toast(res.error, "error");
    setContent((c) => ({ ...c, websites: res.data }));
    setSites(res.data);
    toast("Websites saved");
  };

  const remove = async (site: Website) => {
    const ok = await confirm({
      title: `Remove ${site.name || "this website"}?`,
      body: "It disappears from the website when you save.",
      action: "Remove",
      danger: true,
    });
    if (ok) setSites((l) => l.filter((x) => x.id !== site.id));
  };

  return (
    <>
      <PageHeader
        title="Websites"
        subtitle="Sites you've designed or built. Each one shows in the homepage's swipeable websites row and on the Work page, with a screenshot of its hero section, a short description and a link."
        actions={
          <>
            <Button tone="outline" onClick={add} disabled={!canWrite}>
              <Icon name="plus" /> Add website
            </Button>
            <Button tone="primary" onClick={save} disabled={!dirty || saving || busy || !canWrite}>
              {saving ? "Saving…" : "Save websites"}
            </Button>
          </>
        }
      />
      <UploadProgress jobs={jobs} />

      {sites.length === 0 ? (
        <EmptyState
          title="No websites yet"
          body="Add a site you've worked on: its name, web address, a short description and a screenshot of its hero section."
          action={
            <Button tone="primary" onClick={add} disabled={!canWrite}>
              <Icon name="plus" /> Add your first website
            </Button>
          }
        />
      ) : (
        <Reorder.Group axis="y" values={sites} onReorder={setSites} className="mt-4 space-y-3">
          {sites.map((w) => (
            <SiteRow
              key={w.id}
              site={w}
              onChange={(patch) => update(w.id, patch)}
              onRemove={() => remove(w)}
              onImage={(file) => upload([file], (media) => update(w.id, { image: media }))}
              canUpload={canUpload && canWrite}
            />
          ))}
        </Reorder.Group>
      )}

      {dirty && (
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

function SiteRow({
  site,
  onChange,
  onRemove,
  onImage,
  canUpload,
}: {
  site: Website;
  onChange: (patch: Partial<Website>) => void;
  onRemove: () => void;
  onImage: (file: File) => void;
  canUpload: boolean;
}) {
  const controls = useDragControls();
  const file = useRef<HTMLInputElement>(null);
  const [tagsText, setTagsText] = useState(site.tags.join(", "));
  const [over, setOver] = useState(false);
  let host = "";
  try {
    host = site.url ? new URL(normalizeUrl(site.url)).hostname.replace(/^www\./, "") : "";
  } catch {}

  return (
    <Reorder.Item
      id={`site-${site.id}`}
      value={site}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "grid gap-4 rounded-3xl border border-line bg-surface p-3 sm:p-4 md:grid-cols-[minmax(0,300px)_1fr]",
        !site.published && "opacity-70",
      )}
      whileDrag={{ scale: 1.01, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
    >
      {/* Screenshot */}
      <div>
        <button
          type="button"
          onClick={() => canUpload && file.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f && canUpload) onImage(f);
          }}
          className={cn(
            "group relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border-2 border-dashed bg-ink text-left",
            over ? "border-lime" : site.image ? "border-transparent" : "border-line hover:border-white/30",
          )}
          aria-label={site.image ? "Replace screenshot" : "Upload screenshot"}
        >
          {site.image ? (
            <>
              <Thumb media={site.image} className="object-top" />
              <span className="absolute inset-0 grid place-items-center bg-black/55 text-[13px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
                Replace screenshot
              </span>
            </>
          ) : (
            <span className="absolute inset-0 grid place-items-center px-4 text-center">
              <span>
                <span className="mx-auto grid size-10 place-items-center rounded-full bg-white/[0.06] text-lime">
                  <Icon name="upload" />
                </span>
                <span className="mt-2 block text-[13px] font-medium">Hero screenshot</span>
                <span className="block text-[11px] text-muted">Click or drop · wide image, 16:10 works best</span>
              </span>
            </span>
          )}
        </button>
        <input
          ref={file}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImage(f);
            e.target.value = "";
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <span
            onPointerDown={(e) => controls.start(e)}
            role="button"
            aria-label="Drag to reorder"
            className="flex cursor-grab touch-none items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12px] text-dim hover:bg-white/5"
          >
            <Icon name="drag" className="size-4" /> Drag to reorder
          </span>
          {host && (
            <a href={normalizeUrl(site.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-[12px] text-blue hover:underline">
              {host} <Icon name="external" className="size-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid content-start gap-3 sm:grid-cols-2">
        <Field label="Website name">
          <input className={inputCls} value={site.name} placeholder="e.g. UrbanDrop" onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field label="Web address">
          <input
            className={inputCls}
            value={site.url}
            inputMode="url"
            placeholder="https://example.com"
            onChange={(e) => onChange({ url: e.target.value })}
            onBlur={(e) => onChange({ url: normalizeUrl(e.target.value) })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" hint={`${site.description.length}/600`}>
            <textarea
              className={cn(inputCls, "min-h-[96px] resize-y leading-[1.5]")}
              value={site.description}
              maxLength={600}
              placeholder="What the site is for and what you did — design, development, branding…"
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Tags" hint="Separate with commas, e.g. Next.js, E-commerce">
          <input
            className={inputCls}
            value={tagsText}
            placeholder="UI/UX, Next.js"
            onChange={(e) => {
              setTagsText(e.target.value);
              onChange({
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .slice(0, 8),
              });
            }}
          />
        </Field>
        <Field label="Year">
          <input className={inputCls} value={site.year ?? ""} placeholder="2026" maxLength={10} onChange={(e) => onChange({ year: e.target.value || undefined })} />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 sm:col-span-2">
          <Toggle checked={site.published} onChange={(v) => onChange({ published: v })} label="Show on website" />
          <Button tone="danger" onClick={onRemove}>
            <Icon name="trash" /> Remove
          </Button>
        </div>
      </div>
    </Reorder.Item>
  );
}
