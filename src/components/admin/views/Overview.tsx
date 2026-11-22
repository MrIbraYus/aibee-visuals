"use client";

import { coverOf, motionItemsOf } from "@/lib/content/types";
import { useAdmin } from "../AdminContext";
import { Button, Icon, PageHeader, Panel, Thumb } from "../ui";

export function Overview() {
  const { content, go, state, unread } = useAdmin();
  const assets = content.projects.flatMap((p) => p.assets);
  const stats = [
    { label: "Projects", value: content.projects.length, hint: `${content.projects.filter((p) => p.published).length} live`, view: "projects" as const },
    { label: "Designs & files", value: assets.length, hint: `${assets.filter((a) => a.media.kind === "image").length} images`, view: "projects" as const },
    { label: "Hero images", value: assets.filter((a) => a.hero).length, hint: "On the homepage arc", view: "hero" as const },
    { label: "Brands", value: content.brands.length, hint: "In the logo strip", view: "brands" as const },
    { label: "Motion pieces", value: motionItemsOf(content.projects).length, hint: "Videos & animations", view: "motion" as const },
    { label: "Websites", value: content.websites.length, hint: `${content.websites.filter((w) => w.published).length} live`, view: "websites" as const },
    { label: "Testimonials", value: content.testimonials.length, hint: `${content.testimonials.filter((t) => t.published).length} live`, view: "testimonials" as const },
    { label: "Unread messages", value: unread, hint: "From the contact form", view: "messages" as const },
  ];
  const recent = content.projects
    .flatMap((p) => p.assets.map((a) => ({ a, p })))
    .sort((x, y) => y.a.createdAt - x.a.createdAt)
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title={
          <>
            Good to see you<span className="serif-i font-normal">.</span>
          </>
        }
        subtitle="Everything on the website — projects, websites, hero images, brand logos, motion and testimonials — is managed from here."
        actions={
          <Button tone="primary" onClick={() => go({ name: "project", id: "new" })}>
            <Icon name="plus" /> New project
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => go({ name: s.view })}
            className="rounded-3xl border border-line bg-surface p-4 text-left transition-colors hover:border-white/25 sm:p-5"
          >
            <p className="text-[12px] text-muted">{s.label}</p>
            <p className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.04em]">{s.value}</p>
            <p className="mt-2 text-[12px] text-dim">{s.hint}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Recently added</h2>
            <Button onClick={() => go({ name: "projects" })}>All projects</Button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {recent.map(({ a, p }) => (
              <button
                key={a.id}
                type="button"
                onClick={() => go({ name: "project", id: p.id })}
                className="group relative aspect-square overflow-hidden rounded-xl bg-ink"
                title={`${p.client} — ${a.title ?? ""}`}
              >
                <Thumb media={a.media} className="transition-transform duration-500 group-hover:scale-105" />
                {a.media.kind === "video" && (
                  <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/60">
                    <Icon name="play" className="size-3" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-[18px] font-semibold">Quick actions</h2>
          <ul className="mt-3 divide-y divide-line">
            {[
              { label: "Upload work to a project", body: "Designs, logos, illustrations or videos", onClick: () => go({ name: "projects" }) },
              { label: "Choose hero images", body: "Pick what rides the homepage arc", onClick: () => go({ name: "hero" }) },
              { label: "Update brand logos", body: "The “brands we’ve helped” strip", onClick: () => go({ name: "brands" }) },
              { label: "Add motion work", body: "Logo animations, motion graphics, videos", onClick: () => go({ name: "motion" }) },
              { label: "Add a website", body: "Screenshot, description and link", onClick: () => go({ name: "websites" }) },
              { label: "Add a testimonial", body: "What a client said about you", onClick: () => go({ name: "testimonials" }) },
              { label: "Read messages", body: unread ? `${unread} unread from the contact form` : "From the website's contact form", onClick: () => go({ name: "messages" }) },
            ].map((q) => (
              <li key={q.label}>
                <button type="button" onClick={q.onClick} className="flex w-full items-center justify-between gap-4 py-3.5 text-left">
                  <span>
                    <span className="block text-[14px] font-medium">{q.label}</span>
                    <span className="block text-[12px] text-muted">{q.body}</span>
                  </span>
                  <span className="text-lime">→</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-6">
        <h2 className="text-[18px] font-semibold">Projects</h2>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {content.projects
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((p) => {
              const cover = coverOf(p);
              return (
                <button key={p.id} type="button" onClick={() => go({ name: "project", id: p.id })} className="w-36 shrink-0 text-left">
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-ink">{cover && <Thumb media={cover.media} />}</div>
                  <p className="mt-2 truncate text-[13px] font-medium">{p.client}</p>
                  <p className="text-[12px] text-dim">{p.assets.length} files</p>
                </button>
              );
            })}
        </div>
      </Panel>

      <p className="mt-6 text-[12px] text-dim">
        Storage: {state.storage === "firestore" ? "Firebase" : state.storage === "local" ? "this computer" : "not connected"} · Media:{" "}
        {state.media === "cloudinary" ? "Cloudinary" : state.media === "local" ? "this computer" : "not connected"}
      </p>
    </>
  );
}
