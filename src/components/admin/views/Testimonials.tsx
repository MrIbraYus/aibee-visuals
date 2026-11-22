"use client";

import { Reorder, useDragControls } from "motion/react";
import { useRef, useState } from "react";
import { saveTestimonials } from "@/app/admin/actions";
import { newId, type Testimonial } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { useAdmin } from "../AdminContext";
import { useUploader } from "../useUploader";
import { Button, EmptyState, Field, Icon, inputCls, PageHeader, Thumb, Toggle, UploadProgress } from "../ui";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

const sorted = (list: Testimonial[]) => list.slice().sort((a, b) => a.order - b.order);
const withOrder = (list: Testimonial[]) => list.map((t, i) => ({ ...t, order: i }));

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export function TestimonialsView() {
  const { content, setContent, toast, confirm, canWrite, canUpload } = useAdmin();
  const [list, setList] = useState<Testimonial[]>(() => sorted(content.testimonials));
  const [saving, setSaving] = useState(false);
  const { jobs, upload, busy } = useUploader();
  const dirty = JSON.stringify(withOrder(list)) !== JSON.stringify(withOrder(sorted(content.testimonials)));

  const update = (id: string, patch: Partial<Testimonial>) => setList((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const add = () => {
    const id = newId();
    setList((l) => [{ id, quote: "", name: "", published: true, order: 0, createdAt: Date.now() }, ...l]);
    window.setTimeout(() => document.getElementById(`quote-${id}`)?.querySelector("textarea")?.focus(), 50);
  };

  const save = async () => {
    const cleaned = withOrder(list).map((t) => ({ ...t, quote: t.quote.trim(), name: t.name.trim(), role: t.role?.trim() || undefined }));
    if (cleaned.some((t) => !t.quote)) return toast("Every testimonial needs a quote.", "error");
    if (cleaned.some((t) => !t.name)) return toast("Every testimonial needs the client's name.", "error");
    setSaving(true);
    const res = await saveTestimonials(cleaned);
    setSaving(false);
    if (!res.ok) return toast(res.error, "error");
    setContent((c) => ({ ...c, testimonials: res.data }));
    setList(res.data);
    toast("Testimonials saved");
  };

  const remove = async (t: Testimonial) => {
    const ok = await confirm({
      title: `Remove ${t.name ? `${t.name}'s` : "this"} testimonial?`,
      body: "It disappears from the website when you save.",
      action: "Remove",
      danger: true,
    });
    if (ok) setList((l) => l.filter((x) => x.id !== t.id));
  };

  return (
    <>
      <PageHeader
        title="Testimonials"
        subtitle="What clients say about working with you. The section shows on the homepage once at least one testimonial is switched on."
        actions={
          <>
            <Button tone="outline" onClick={add} disabled={!canWrite}>
              <Icon name="plus" /> Add testimonial
            </Button>
            <Button tone="primary" onClick={save} disabled={!dirty || saving || busy || !canWrite}>
              {saving ? "Saving…" : "Save testimonials"}
            </Button>
          </>
        }
      />
      <UploadProgress jobs={jobs} />

      {list.length === 0 ? (
        <EmptyState
          title="No testimonials yet"
          body="Paste a client's words, add their name and role, and optionally a photo."
          action={
            <Button tone="primary" onClick={add} disabled={!canWrite}>
              <Icon name="plus" /> Add your first testimonial
            </Button>
          }
        />
      ) : (
        <Reorder.Group axis="y" values={list} onReorder={setList} className="mt-4 space-y-3">
          {list.map((t) => (
            <QuoteRow
              key={t.id}
              item={t}
              onChange={(patch) => update(t.id, patch)}
              onRemove={() => remove(t)}
              onAvatar={(file) => upload([file], (media) => update(t.id, { avatar: media }))}
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

function QuoteRow({
  item,
  onChange,
  onRemove,
  onAvatar,
  canUpload,
}: {
  item: Testimonial;
  onChange: (patch: Partial<Testimonial>) => void;
  onRemove: () => void;
  onAvatar: (file: File) => void;
  canUpload: boolean;
}) {
  const controls = useDragControls();
  const file = useRef<HTMLInputElement>(null);
  return (
    <Reorder.Item
      id={`quote-${item.id}`}
      value={item}
      dragListener={false}
      dragControls={controls}
      className={cn("rounded-3xl border border-line bg-surface p-3 sm:p-4", !item.published && "opacity-70")}
      whileDrag={{ scale: 1.01, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => canUpload && file.current?.click()}
            className="group relative grid size-14 place-items-center overflow-hidden rounded-full bg-lime/15 text-[16px] font-semibold text-lime sm:size-16"
            title={canUpload ? (item.avatar ? "Replace photo" : "Add photo (optional)") : undefined}
            aria-label={item.avatar ? "Replace photo" : "Add photo"}
          >
            {item.avatar ? <Thumb media={item.avatar} /> : initialsOf(item.name) || <Icon name="image" />}
            <span className="absolute inset-0 grid place-items-center bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Icon name="upload" className="size-4" />
            </span>
          </button>
          {item.avatar && (
            <button type="button" onClick={() => onChange({ avatar: undefined })} className="text-[11px] text-dim hover:text-white">
              Remove
            </button>
          )}
          <input
            ref={file}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAvatar(f);
              e.target.value = "";
            }}
          />
          <span
            onPointerDown={(e) => controls.start(e)}
            role="button"
            aria-label="Drag to reorder"
            className="mt-auto grid size-9 cursor-grab touch-none place-items-center rounded-lg text-dim hover:bg-white/5"
          >
            <Icon name="drag" />
          </span>
        </div>

        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Quote" hint={`${item.quote.length}/700`}>
              <textarea
                className={cn(inputCls, "min-h-[110px] resize-y leading-[1.5]")}
                value={item.quote}
                maxLength={700}
                placeholder="What did the client say about working with you?"
                onChange={(e) => onChange({ quote: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Client name">
            <input className={inputCls} value={item.name} placeholder="Full name" onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Role & company">
            <input
              className={inputCls}
              value={item.role ?? ""}
              placeholder="e.g. Founder, UrbanDrop"
              onChange={(e) => onChange({ role: e.target.value || undefined })}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 sm:col-span-2">
            <Toggle checked={item.published} onChange={(v) => onChange({ published: v })} label="Show on website" />
            <Button tone="danger" onClick={onRemove}>
              <Icon name="trash" /> Remove
            </Button>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
