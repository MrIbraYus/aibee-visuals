"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { scrollToTarget } from "./store";

/**
 * Navigates to a homepage section ("#services"). On the homepage it smooth
 * scrolls; on any other page it routes to "/#services".
 */
export function useSectionNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";

  const go = useCallback(
    (hash: string) => {
      // Motion has its own page when the homepage section isn't there.
      if (hash === "#motion" && (!onHome || !document.querySelector(hash))) return router.push("/motion");
      if (onHome) scrollToTarget(hash === "#home" ? 0 : hash, -20);
      else router.push(hash === "#home" ? "/" : `/${hash}`);
    },
    [onHome, router],
  );

  return { go, onHome, pathname };
}
