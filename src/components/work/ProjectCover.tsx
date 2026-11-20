import Image from "next/image";
import { coverOf, type Project } from "@/lib/content/types";
import { imageProps } from "@/lib/media/urls";

/** A project's cover image (or a branded placeholder while it has none). Fills its parent. */
export function ProjectCover({
  project,
  sizes,
  priority,
  className = "object-cover",
}: {
  project: Project;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const cover = coverOf(project);
  if (cover) {
    return (
      <Image
        {...imageProps(cover.media.url)}
        alt={`${project.client} — ${cover.title ?? project.title}`}
        fill
        sizes={sizes}
        preload={priority}
        className={className}
      />
    );
  }
  return (
    <div
      className="absolute inset-0 grid place-items-center p-6 text-center"
      style={{ background: `radial-gradient(circle at 30% 20%, ${project.accent ?? "#1261f5"}, #0b0b0b 70%)` }}
    >
      <span className="font-logo text-[clamp(24px,3vw,40px)] font-extrabold leading-none tracking-[-0.03em] text-white">{project.client}</span>
    </div>
  );
}
