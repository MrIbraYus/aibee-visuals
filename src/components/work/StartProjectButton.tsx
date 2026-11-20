"use client";

import { PillButton } from "@/components/ui/Primitives";
import { openProjectDrawer } from "@/lib/store";

export function StartProjectButton({ label = "Start a similar project" }: { label?: string }) {
  return <PillButton onClick={openProjectDrawer}>{label}</PillButton>;
}
