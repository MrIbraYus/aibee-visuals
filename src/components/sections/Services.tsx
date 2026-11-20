"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { services, type Service } from "@/content/site";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { openProjectDrawer } from "@/lib/store";
import { ArrowUpRight } from "@/components/ui/Primitives";
import { cn, prefersReducedMotion } from "@/lib/utils";

const ServiceIcon3D = dynamic(() => import("@/components/three/ServiceIcon3D"), { ssr: false });

function Corner() {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 text-lime" aria-hidden>
      <path d="M1 13V1h12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m1 1 7 7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ServiceColumn({ service }: { service: Service }) {
  const activeRef = useRef(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  const setActive = (v: boolean) => {
    activeRef.current = v;
    setOpen(v);
  };

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    ref.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <li
      ref={ref}
      data-service
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onPointerMove={onMove}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        setActive(!activeRef.current);
      }}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className="group relative isolate flex min-h-[230px] flex-col overflow-hidden rounded-3xl border border-white/[0.06] p-4 sm:min-h-[260px] sm:p-5 lg:border-white/0 transition-colors duration-500 hover:border-white/10 lg:min-h-[300px]"
      style={{ ["--accent" as string]: service.accent }}
    >
      {/* cursor spotlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(260px circle at var(--mx, 50%) var(--my, 30%), color-mix(in srgb, ${service.accent} 26%, transparent), transparent 70%)`,
        }}
      />
      <div className="flex items-start justify-between">
        <Corner />
        <div className="-mr-3 -mt-4 size-[92px] sm:-mr-4 sm:-mt-6 sm:size-[128px]">
          <ServiceIcon3D icon={service.icon} activeRef={activeRef} className="size-full" />
        </div>
      </div>
      <h3 className="mt-auto text-[18px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[22px]">
        {service.title.split(" ").map((w, i) => (
          <span key={i} className="block">
            {w}
          </span>
        ))}
      </h3>
      <p className="mt-3 max-w-[16ch] text-[13px] leading-[1.45] text-muted">{service.blurb}</p>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-500 ease-expo",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <ul className="overflow-hidden">
          {service.deliverables.map((d) => (
            <li key={d} className="mt-2 flex items-center gap-2 text-[13px] text-white/90 first:mt-4">
              <span className="size-1.5 rounded-full" style={{ background: service.accent }} />
              {d}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={openProjectDrawer}
        aria-label={`Start a ${service.title} project`}
        className="mt-4 w-fit text-lime transition-transform duration-500 ease-expo group-hover:rotate-45"
      >
        <ArrowUpRight className="size-[18px]" />
      </button>
    </li>
  );
}

/** 02 / What we do */
export function Services() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(ref);
      const a = SplitText.create(q("[data-sv-a]"), { type: "words,chars", mask: "words" });
      const b = SplitText.create(q("[data-sv-b]"), { type: "words", mask: "words" });
      [...b.masks].forEach((m) => {
        (m as HTMLElement).style.paddingBottom = "0.16em";
        (m as HTMLElement).style.marginBottom = "-0.16em";
      });
      gsap
        .timeline({ scrollTrigger: { trigger: ref.current, start: "top 70%" } })
        .from(a.chars, { yPercent: 110, stagger: 0.018, duration: 1.1 }, 0)
        .from(b.words, { yPercent: 110, rotate: 6, stagger: 0.07, duration: 1.2 }, 0.2)
        .from(
          q("[data-service]"),
          { y: 80, rotate: (i: number) => (i % 2 ? 4 : -4), autoAlpha: 0, stagger: 0.1, duration: 1.3 },
          0.25,
        );
    },
    { scope: ref },
  );

  return (
    <section id="services" ref={ref} className="relative z-10 overflow-hidden bg-ink-2">
      <div className="grain" />
      <div className="frame relative grid gap-10 py-[clamp(72px,9vw,128px)] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5 xl:col-span-4">
          <h2 className="text-[clamp(36px,3.6vw,52px)] leading-[1.02] tracking-[-0.04em]">
            <span data-sv-a className="block font-semibold">
              Creative thinking.
            </span>
            <span data-sv-b className="serif-i block text-[1.12em] tracking-[-0.03em]">
              Distinctive execution.
            </span>
          </h2>
          <p className="mt-6 max-w-[34ch] text-[15px] leading-[1.55] text-muted">
            Strategy, design and digital under one roof — so your brand looks and feels the same everywhere it shows up.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 lg:col-span-7 lg:grid-cols-4 xl:col-span-8">
          {services.map((s) => (
            <ServiceColumn key={s.title} service={s} />
          ))}
        </ul>
      </div>
    </section>
  );
}
