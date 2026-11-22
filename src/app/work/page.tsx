import type { Metadata } from "next";
import { WorkWall } from "@/components/work/WorkWall";
import { Reveal } from "@/components/work/Reveal";
import { getSiteContent } from "@/lib/content/queries";

export const metadata: Metadata = {
  title: "Work",
  description: "Brand identities, logos, illustrations, campaigns, websites and motion by Aibee Visuals: every piece, in one place.",
  alternates: { canonical: "/work" },
};

export default async function WorkPage() {
  const { projects, websites } = await getSiteContent();
  return (
    <section className="relative bg-ink pb-[clamp(72px,9vw,120px)] pt-[clamp(88px,9vw,132px)]">
      <div className="grain" />
      {/* Wider than the rest of the site, Pinterest-style, so more work fits on screen. */}
      <div className="relative mx-auto max-w-[1840px] px-[var(--wall-pad)] [--wall-pad:clamp(12px,2.2vw,40px)]">
        <Reveal className="mb-5 flex flex-col gap-2 sm:mb-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <h1 className="text-[clamp(34px,4.8vw,76px)] font-semibold leading-[0.95] tracking-[-0.05em]">
            Selected work, <span className="serif-i font-normal tracking-[-0.03em]">all of it.</span>
          </h1>
          <p className="max-w-[46ch] text-[14px] leading-[1.5] text-muted sm:text-[15px] lg:pb-1.5">
            Every design, logo, illustration, animation and website we&apos;ve made. Tap any piece to see it up close.
          </p>
        </Reveal>
        <WorkWall projects={projects} websites={websites} />
      </div>
    </section>
  );
}
