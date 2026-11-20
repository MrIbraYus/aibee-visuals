"use client";

import { useEffect, useState } from "react";
import { getInquiries } from "@/app/admin/actions";
import type { Inquiry } from "@/lib/content/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, PageHeader } from "../ui";

export function BriefsView() {
  const { toast } = useAdmin();
  const [list, setList] = useState<Inquiry[] | null>(null);

  useEffect(() => {
    let alive = true;
    getInquiries().then((res) => {
      if (!alive) return;
      if (res.ok) setList(res.data);
      else {
        toast(res.error, "error");
        setList([]);
      }
    });
    return () => {
      alive = false;
    };
  }, [toast]);

  return (
    <>
      <PageHeader
        title="Briefs"
        subtitle="Every brief sent from the “Start a project” form. Clients also send it to your WhatsApp — this is your searchable copy."
      />
      {list === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No briefs yet" body="When someone sends a brief from the website, it appears here." />
      ) : (
        <ul className="space-y-3">
          {list.map((b) => (
            <li key={b.id} className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[17px] font-semibold">
                    {b.name}
                    {b.company && <span className="font-normal text-muted"> · {b.company}</span>}
                  </p>
                  <a href={`mailto:${b.email}`} className="text-[14px] text-blue hover:underline">
                    {b.email}
                  </a>
                </div>
                <time className="text-[12px] text-dim" dateTime={new Date(b.createdAt).toISOString()}>
                  {new Date(b.createdAt).toLocaleString()}
                </time>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {b.services.map((s) => (
                  <span key={s} className="rounded-full bg-lime/15 px-2.5 py-1 text-[12px] text-lime">
                    {s}
                  </span>
                ))}
                <span className="rounded-full border border-line px-2.5 py-1 text-[12px]">{b.budget}</span>
                <span className="rounded-full border border-line px-2.5 py-1 text-[12px]">{b.timeline}</span>
              </div>
              <p className="mt-4 whitespace-pre-line text-[14px] leading-[1.6] text-white/85">{b.message}</p>
              <a
                href={`mailto:${b.email}?subject=${encodeURIComponent("Re: your project brief")}`}
                className="mt-4 inline-block rounded-full border border-line px-4 py-2 text-[13px] hover:border-white/40"
              >
                Reply by email
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
