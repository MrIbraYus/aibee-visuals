import type { Metadata } from "next";
import { Reveal } from "@/components/work/Reveal";
import { MotionLibrary } from "@/components/motion/MotionLibrary";
import { getHomeData } from "@/lib/content/queries";

export const metadata: Metadata = {
  title: "Motion",
  description: "Logo animations, motion graphics and video by Aibee Visuals.",
  alternates: { canonical: "/motion" },
};

export default async function MotionPage() {
  const { motion } = await getHomeData();
  return (
    <section className="relative bg-ink pb-[clamp(80px,10vw,140px)] pt-[clamp(140px,18vw,220px)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_at_50%_0%,rgba(18,97,245,0.35),transparent_65%)]" />
      <div className="frame relative">
        <Reveal className="max-w-[900px]">
          <h1 className="text-[clamp(52px,9vw,140px)] font-semibold leading-[0.9] tracking-[-0.055em]">
            Things <span className="serif-i font-normal tracking-[-0.03em]">that move.</span>
          </h1>
          <p className="mt-8 max-w-[46ch] text-[18px] leading-[1.55] text-muted">
            Logo animations, motion graphics and video. Tap any piece to watch it full screen.
          </p>
        </Reveal>
        <MotionLibrary items={motion} />
      </div>
    </section>
  );
}
