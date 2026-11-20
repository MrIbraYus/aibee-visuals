import type { Metadata } from "next";
import { WorkArchive } from "@/components/work/WorkArchive";
import { Reveal } from "@/components/work/Reveal";
import { getSiteContent } from "@/lib/content/queries";

export const metadata: Metadata = {
  title: "Work",
  description: "Brand identities, campaigns, social content, motion and digital experiences by Aibee Visuals.",
  alternates: { canonical: "/work" },
};

export default async function WorkPage() {
  const { projects } = await getSiteContent();
  return (
    <section className="relative bg-ink pb-[clamp(80px,10vw,140px)] pt-[clamp(140px,18vw,220px)]">
      <div className="grain" />
      <div className="frame relative">
        <Reveal className="max-w-[900px]">
          <h1 className="text-[clamp(52px,8vw,128px)] font-semibold leading-[0.92] tracking-[-0.055em]">
            Selected work, <span className="serif-i font-normal tracking-[-0.03em]">all of it.</span>
          </h1>
          <p className="mt-8 max-w-[46ch] text-[18px] leading-[1.55] text-muted">
            Identities, campaigns, content systems and motion — made for brands that want to be remembered.
          </p>
        </Reveal>
        <div className="mt-14">
          <WorkArchive projects={projects} />
        </div>
      </div>
    </section>
  );
}
