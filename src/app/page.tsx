import { HeroScene } from "@/components/hero/HeroScene";
import { Studio } from "@/components/sections/Studio";
import { Services } from "@/components/sections/Services";
import { Work } from "@/components/sections/Work";
import { Gallery } from "@/components/sections/Gallery";
import { Manifesto } from "@/components/sections/Manifesto";
import { MotionReel } from "@/components/sections/MotionReel";
import { Approach } from "@/components/sections/Approach";
import { Contact } from "@/components/sections/Contact";
import { Websites } from "@/components/sections/Websites";
import { Testimonials } from "@/components/sections/Testimonials";
import { Preloader } from "@/components/ui/Preloader";
import { getHomeData } from "@/lib/content/queries";
import { coverOf } from "@/lib/content/types";
import { site } from "@/content/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: site.name,
  description: site.description,
  url: site.url,
  email: site.email,
  telephone: site.phoneIntl,
  sameAs: site.socials.map((s) => s.href),
  knowsAbout: ["Brand Identity", "Logo Design", "UI/UX Design", "Web Design", "Social Media Design", "Graphic Design", "Motion Design"],
};

export default async function Home() {
  const { projects, brands, websites, testimonials, featured, hero, motion } = await getHomeData();

  // Hero arc: the images you picked in the dashboard, else every project cover.
  const arc = (hero.length ? hero.map((h) => ({ asset: h.asset, project: h.project })) : projects.map((p) => ({ asset: coverOf(p), project: p })))
    .filter((x) => x.asset)
    .map((x) => ({ src: x.asset!.media.url, alt: `${x.project.client} — ${x.asset!.title ?? x.project.title}` }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Preloader />
      <HeroScene items={arc} brands={brands} />
      <Studio />
      <Services />
      <Work projects={featured.length ? featured : projects.slice(0, 5)} />
      {websites.length > 0 && <Websites sites={websites} />}
      <Gallery projects={projects} />
      <Manifesto images={arc.slice(0, 3).map((a) => a.src)} />
      <MotionReel items={motion} />
      {testimonials.length > 0 && <Testimonials items={testimonials} />}
      <Approach />
      <Contact />
    </>
  );
}
