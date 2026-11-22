"use client";

import { PillButton } from "@/components/ui/Primitives";
import { openMessage } from "@/lib/store";

/** Opens the "Send a message" panel, already noting what the visitor is asking about. */
export function MessageButton({ label = "Send a message", topic }: { label?: string; topic?: string }) {
  return <PillButton onClick={() => openMessage(topic)}>{label}</PillButton>;
}
