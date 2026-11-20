import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, getSiteContent } from "@/lib/content/queries";
import { assetTypeLabels, assetTypes, coverOf } from "@/lib/content/types";
import { mediaThumb } from "@/lib/media/urls";
import { whatsappUrl } from "@/lib/contact";
import { Reveal } from "@/components/work/Reveal";
import { ProjectGallery } from "@/components/work/ProjectGallery";
import { StartProjectButton } from "@/components/work/StartProjectButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export async function generateStaticParams() {
  const { projects } = await getSiteContent();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getProjectBySlug(slug);
  if (!found) return {};
  const { project } = found;
  const cover = coverOf(project);
  const image = cover ? mediaThumb(cover.media, 1200) : undefined;
  return {
    title: `${project.client} — ${project.title}`,
    description: project.summary,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: image ? { images: [{ url: image }] } : undefined,
  };
}

export default function ProjectPage({ params }: PageProps<"/work/[slug]">) {
  return (
    <Suspense fallback={<ProjectSkeleton />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

function ProjectSkeleton() {
  return (
    <div className="frame min-h-svh animate-pulse pt-[clamp(130px,16vw,200px)]" aria-busy>
      <div className="h-4 w-24 rounded bg-white/10" />
      <div className="mt-8 h-24 w-3/4 rounded-2xl bg-white/10" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/5] rounded-[20px] bg-white/5" />
        ))}
      </div>
    </div>
  );
}

async function ProjectContent({ params }: { params: PageProps<"/work/[slug]">["params"] }) {
  const { slug } = await params;
  const found = await getProjectBySlug(slug);
  if (!found) notFound();
  const { project, next } = found;
  const counts = assetTypes
    .map((t) => ({ t, n: project.assets.filter((a) => a.type === t).length }))
    .filter((c) => c.n > 0);

  return (
    <article className="relative bg-ink">
      <div className="grain" />
      <header className="frame relative pb-12 pt-[clamp(120px,16vw,200px)] sm:pb-16">
        <Reveal>
          <Link href="/work" className="text-[14px] text-muted transition-colors hover:text-white">
            ← All work
          </Link>
          <div className="mt-8 flex items-center gap-3">
            <span className="size-3 rounded-full" style={{ background: project.accent ?? "#b7f500" }} />
            <p className="text-[15px] font-semibold">{project.client}</p>
          </div>
        </Reveal>
        <div className="mt-5 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-7">
            <h1 className="serif-i text-[clamp(46px,7vw,112px)] leading-[0.95] tracking-[-0.03em]">{project.title}</h1>
            {project.summary && <p className="mt-7 max-w-[52ch] text-[17px] leading-[1.6] text-muted">{project.summary}</p>}
          </Reveal>
          <Reveal className="lg:col-span-5 lg:pt-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 text-[14px]">
              <div>
                <dt className="text-dim">Category</dt>
                <dd className="mt-1">{project.category}</dd>
              </div>
              <div>
                <dt className="text-dim">Year</dt>
                <dd className="mt-1">{project.year}</dd>
              </div>
              {counts.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-dim">In this project</dt>
                  <dd className="mt-1">{counts.map((c) => `${c.n} ${assetTypeLabels[c.t].toLowerCase()}`).join(" · ")}</dd>
                </div>
              )}
              {project.services.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-dim">Services</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {project.services.map((s) => (
                      <span key={s} className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-white/90">
                        {s}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StartProjectButton />
              <a
                href={whatsappUrl(`Hi Aibee Visuals! I saw the ${project.client} project and I'd like something similar.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full border border-white/20 px-5 py-4 text-[14px] font-medium transition-colors hover:border-[#25d366] hover:bg-[#25d366] hover:text-[#06210f]"
              >
                <WhatsAppIcon className="size-[18px]" />
                WhatsApp
              </a>
            </div>
          </Reveal>
        </div>
      </header>

      <section aria-label={`${project.client} work`} className="frame relative pb-24">
        <ProjectGallery project={project} />
      </section>

      {next.slug !== project.slug && (
        <Link href={`/work/${next.slug}`} className="group relative block overflow-hidden border-t border-line" data-cursor="Next">
          <div className="frame flex items-end justify-between gap-6 py-16 sm:py-24">
            <div className="min-w-0">
              <p className="text-[14px] text-muted">Next project</p>
              <p className="mt-3 text-[clamp(36px,6vw,96px)] font-semibold leading-[0.95] tracking-[-0.05em] transition-colors duration-500 group-hover:text-lime">
                {next.client} <span className="serif-i font-normal text-white/70">{next.title}</span>
              </p>
            </div>
            <span className="hidden size-20 shrink-0 place-items-center rounded-full bg-lime text-[28px] text-ink transition-transform duration-500 ease-expo group-hover:translate-x-2 sm:grid">
              →
            </span>
          </div>
        </Link>
      )}
    </article>
  );
}
