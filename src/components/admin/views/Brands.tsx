"use client";

import { Reorder, useDragControls } from "motion/react";
import { useRef, useState } from "react";
import { saveBrands } from "@/app/admin/actions";
import { newId, type Brand } from "@/lib/content/types";
import { useAdmin } from "../AdminContext";
import { useUploader } from "../useUploader";
import { Button, EmptyState, Icon, inputCls, PageHeader, Thumb, UploadProgress } from "../ui";

const LOGO_ACCEPT = "image/svg+xml,image/png,image/webp";

export function BrandsView() {
  const { content, setContent, toast, canWrite, canUpload } = useAdmin();
  const [brands, setBrands] = useState<Brand[]>(() => content.brands.slice().sort((a, b) => a.order - b.order));
  const [saving, setSaving] = useState(false);
  const { jobs, upload, busy } = useUploader();
  const dirty = JSON.stringify(brands.map((b, i) => ({ ...b, order: i }))) !== JSON.stringify(content.brands.slice().sort((a, b) => a.order - b.order).map((b, i) => ({ ...b, order: i })));

  const update = (id: string, patch: Partial<Brand>) => setBrands((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const save = async () => {
    const invalid = brands.find((b) => !b.name.trim());
    if (invalid) return toast("Every brand needs a name.", "error");
    setSaving(true);
    const res = await saveBrands(brands.map((b, i) => ({ ...b, name: b.name.trim(), order: i })));
    setSaving(false);
    if (!res.ok) return toast(res.error, "error");
    setContent((c) => ({ ...c, brands: res.data }));
    setBrands(res.data);
    toast("Brands saved");
  };

  const addFromFiles = (files: File[]) =>
    upload(files, (media, file) => {
      const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\blogo\b/i, "").trim();
      setBrands((list) => [...list, { id: newId(), name: name || "New brand", logo: media, order: list.length }]);
    });

  return (
    <>
      <PageHeader
        title="Brands"
        subtitle="Logos in the “Brands we’ve helped move forward” strip. Use a transparent PNG or SVG — logos are shown in white on dark, so single-colour marks work best. Brands without a logo show their name."
        actions={
          <>
            <Button tone="outline" onClick={() => setBrands((l) => [...l, { id: newId(), name: "", order: l.length }])} disabled={!canWrite}>
              <Icon name="plus" /> Add brand
            </Button>
            <Button tone="primary" onClick={save} disabled={!dirty || saving || busy || !canWrite}>
              {saving ? "Saving…" : "Save brands"}
            </Button>
          </>
        }
      />

      {canUpload && canWrite && (
        <label className="mb-6 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line px-4 py-5 text-[14px] text-white/80 transition-colors hover:border-white/30">
          <Icon name="upload" className="text-lime" />
          Upload logos (one brand per file)
          <input type="file" accept={LOGO_ACCEPT} multiple className="sr-only" onChange={(e) => {
            addFromFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }} />
        </label>
      )}
      <UploadProgress jobs={jobs} />

      {brands.length === 0 ? (
        <EmptyState title="No brands yet" body="Upload the logos of brands you've worked with." />
      ) : (
        <Reorder.Group axis="y" values={brands} onReorder={setBrands} className="mt-4 space-y-2">
          {brands.map((b) => (
            <BrandRow
              key={b.id}
              brand={b}
              onChange={(patch) => update(b.id, patch)}
              onRemove={() => setBrands((l) => l.filter((x) => x.id !== b.id))}
              onReplace={(file) =>
                upload([file], (media) => update(b.id, { logo: media }))
              }
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

function BrandRow({
  brand,
  onChange,
  onRemove,
  onReplace,
  canUpload,
}: {
  brand: Brand;
  onChange: (patch: Partial<Brand>) => void;
  onRemove: () => void;
  onReplace: (file: File) => void;
  canUpload: boolean;
}) {
  const controls = useDragControls();
  const file = useRef<HTMLInputElement>(null);
  return (
    <Reorder.Item
      value={brand}
      dragListener={false}
      dragControls={controls}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 sm:grid-cols-[auto_auto_1fr_1fr_140px]"
      whileDrag={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
    >
      <span onPointerDown={(e) => controls.start(e)} role="button" aria-label="Drag to reorder" className="grid size-9 cursor-grab touch-none place-items-center rounded-lg text-dim hover:bg-white/5">
        <Icon name="drag" />
      </span>
      <button
        type="button"
        onClick={() => canUpload && file.current?.click()}
        className="relative grid h-14 w-28 place-items-center overflow-hidden rounded-xl bg-ink px-2 sm:w-36"
        title={canUpload ? "Replace logo" : undefined}
      >
        {brand.logo ? (
          <span className="block h-9 w-full [&_img]:brightness-0 [&_img]:invert">
            <Thumb media={brand.logo} fit="contain" />
          </span>
        ) : (
          <span className="truncate font-logo text-[15px] font-extrabold">{brand.name || "Logo"}</span>
        )}
        <input ref={file} type="file" accept={LOGO_ACCEPT} className="sr-only" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onReplace(f);
          e.target.value = "";
        }} />
      </button>
      <input className={`${inputCls} col-span-2 py-2.5 sm:col-span-1`} value={brand.name} placeholder="Brand name" onChange={(e) => onChange({ name: e.target.value })} aria-label="Brand name" />
      <input
        className={`${inputCls} col-span-2 py-2.5 sm:col-span-1`}
        value={brand.url ?? ""}
        placeholder="Website (optional)"
        onChange={(e) => onChange({ url: e.target.value || undefined })}
        aria-label="Brand website"
      />
      <div className="col-span-3 flex justify-end gap-1 sm:col-span-1">
        {brand.logo && (
          <Button className="px-3 text-[13px]" onClick={() => onChange({ logo: undefined })}>
            Use name
          </Button>
        )}
        <Button tone="danger" className="px-3" onClick={onRemove} aria-label={`Remove ${brand.name}`}>
          <Icon name="trash" />
        </Button>
      </div>
    </Reorder.Item>
  );
}
