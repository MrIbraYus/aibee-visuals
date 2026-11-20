"use client";

import { Canvas, type CanvasProps } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<CanvasProps, "frameloop"> & { className?: string; eager?: boolean };

/**
 * Mounts a WebGL canvas only when it approaches the viewport and stops
 * rendering whenever it scrolls out of view, so several 3D moments can live
 * on one page without fighting for the GPU.
 */
export function LazyCanvas({ className, children, eager = false, ...props }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(eager);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setMounted(true);
        setVisible(entry.isIntersecting);
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {mounted && (
        <Canvas
          frameloop={visible ? "always" : "never"}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          {...props}
        >
          {children}
        </Canvas>
      )}
    </div>
  );
}
