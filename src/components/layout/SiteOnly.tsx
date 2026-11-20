"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Renders the public-site chrome everywhere except the /admin dashboard. */
export function SiteOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
