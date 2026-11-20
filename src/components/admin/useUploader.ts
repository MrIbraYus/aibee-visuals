"use client";

import { useCallback, useRef, useState } from "react";
import { getUploadTarget } from "@/app/admin/actions";
import { uploadFile } from "@/lib/admin/upload";
import type { Media } from "@/lib/content/types";
import type { UploadTarget } from "@/lib/media/server";
import { useAdmin } from "./AdminContext";
import type { UploadJob } from "./ui";

const TARGET_TTL = 40 * 60 * 1000; // Cloudinary signatures last an hour

/** Uploads files (3 at a time) and reports progress for each. */
export function useUploader() {
  const { toast } = useAdmin();
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const target = useRef<{ value: UploadTarget; at: number } | null>(null);

  const getTarget = useCallback(async () => {
    if (target.current && Date.now() - target.current.at < TARGET_TTL) return target.current.value;
    const res = await getUploadTarget();
    if (!res.ok) throw new Error(res.error);
    target.current = { value: res.data, at: Date.now() };
    return res.data;
  }, []);

  const upload = useCallback(
    async (files: File[], onUploaded: (media: Media, file: File) => void) => {
      if (!files.length) return;
      let t: UploadTarget;
      try {
        t = await getTarget();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload unavailable.", "error");
        return;
      }
      const batch = files.map((f) => ({ id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`, name: f.name, progress: 0 }));
      setJobs((j) => [...j, ...batch]);
      const update = (id: string, patch: Partial<UploadJob>) => setJobs((j) => j.map((x) => (x.id === id ? { ...x, ...patch } : x)));

      let index = 0;
      let failed = 0;
      const worker = async () => {
        while (index < files.length) {
          const i = index++;
          const file = files[i];
          const job = batch[i];
          try {
            const media = await uploadFile(file, t, (p) => update(job.id, { progress: p }));
            onUploaded(media, file);
            update(job.id, { progress: 1 });
            window.setTimeout(() => setJobs((j) => j.filter((x) => x.id !== job.id)), 900);
          } catch (err) {
            failed++;
            update(job.id, { error: err instanceof Error ? err.message : "Upload failed" });
          }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      if (failed) toast(`${failed} file${failed > 1 ? "s" : ""} couldn't be uploaded.`, "error");
    },
    [getTarget, toast],
  );

  const clearErrors = useCallback(() => setJobs((j) => j.filter((x) => !x.error)), []);

  return { jobs, upload, clearErrors, busy: jobs.some((j) => !j.error && j.progress < 1) };
}
