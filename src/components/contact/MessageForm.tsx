"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { messageSchema, type MessageInput } from "@/lib/validation";
import { whatsappUrl } from "@/lib/contact";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { cn } from "@/lib/utils";

type Draft = { name: string; contact: string; message: string; website: string };
type Errors = Partial<Record<keyof Draft, string>>;
const empty: Draft = { name: "", contact: "", message: "", website: "" };
const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Name, email-or-phone and a message. It lands in the studio's dashboard
 * inbox (with a notification); WhatsApp is always offered alongside.
 */
export function MessageForm({
  topic,
  onClearTopic,
  tone = "dark",
  autoFocus,
}: {
  topic?: string;
  onClearTopic?: () => void;
  /** "light" for cream/lime backgrounds. */
  tone?: "dark" | "light";
  autoFocus?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const light = tone === "light";

  const set = (key: keyof Draft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFailure(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    const input: MessageInput = { ...draft, topic: topic ?? "" };
    const parsed = messageSchema.safeParse(input);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Draft;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Your message couldn't be sent.");
      setState("sent");
    } catch (err) {
      setState("idle");
      setFailure(err instanceof Error ? err.message : "Your message couldn't be sent.");
    }
  };

  const waText = `Hi Aibee Visuals! ${topic ? `I'm interested in ${topic}. ` : ""}${draft.message.trim()}`.trim();

  const field = cn(
    "w-full rounded-2xl border px-4 py-3.5 text-[16px] outline-none transition-colors",
    light
      ? "border-ink/15 bg-white/60 text-ink placeholder:text-ink/40 focus:border-ink"
      : "border-white/12 bg-white/[0.04] text-white placeholder:text-white/35 focus:border-lime",
  );
  const errorCls = cn("mt-1.5 block text-[12px]", light ? "text-[#b00045]" : "text-magenta");

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {state === "sent" ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease }}
            role="status"
            className={cn("rounded-3xl p-6", light ? "bg-ink text-white" : "bg-lime text-ink")}
          >
            <span className={cn("grid size-12 place-items-center rounded-full", light ? "bg-lime text-ink" : "bg-ink text-lime")}>
              <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
                <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="mt-5 text-[26px] font-semibold leading-[1.05] tracking-[-0.03em]">
              Message sent<span className="serif-i font-normal">, thank you.</span>
            </p>
            <p className={cn("mt-2 text-[14px] leading-[1.5]", light ? "text-white/70" : "text-ink/70")}>
              We&apos;ll reply soon on the email or number you left. Need us sooner? We&apos;re on WhatsApp.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={whatsappUrl(waText)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2.5 text-[14px] font-medium text-[#06210f]"
              >
                <WhatsAppIcon className="size-4" /> WhatsApp us
              </a>
              <button
                type="button"
                onClick={() => {
                  setDraft(empty);
                  setState("idle");
                }}
                className={cn("rounded-full border px-4 py-2.5 text-[14px]", light ? "border-white/25" : "border-ink/25")}
              >
                Send another
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            noValidate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            {topic && (
              <p
                className={cn(
                  "inline-flex items-center gap-2 rounded-full py-1.5 pl-3.5 pr-1.5 text-[13px]",
                  light ? "bg-ink text-white" : "bg-white/[0.08] text-white",
                )}
              >
                About: <strong className="font-medium">{topic}</strong>
                {onClearTopic && (
                  <button type="button" onClick={onClearTopic} aria-label="Remove topic" className="grid size-6 place-items-center rounded-full hover:bg-white/15">
                    <svg viewBox="0 0 24 24" className="size-3" aria-hidden>
                      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-name`} className="sr-only">
                  Your name
                </label>
                <input
                  id={`${id}-name`}
                  className={field}
                  placeholder="Your name"
                  autoComplete="name"
                  autoFocus={autoFocus}
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? `${id}-name-err` : undefined}
                />
                {errors.name && (
                  <span id={`${id}-name-err`} className={errorCls}>
                    {errors.name}
                  </span>
                )}
              </div>
              <div>
                <label htmlFor={`${id}-contact`} className="sr-only">
                  Email or phone number
                </label>
                <input
                  id={`${id}-contact`}
                  className={field}
                  placeholder="Email or phone"
                  autoComplete="email"
                  inputMode="email"
                  value={draft.contact}
                  onChange={(e) => set("contact", e.target.value)}
                  aria-invalid={Boolean(errors.contact)}
                  aria-describedby={errors.contact ? `${id}-contact-err` : undefined}
                />
                {errors.contact && (
                  <span id={`${id}-contact-err`} className={errorCls}>
                    {errors.contact}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label htmlFor={`${id}-message`} className="sr-only">
                Your message
              </label>
              <textarea
                id={`${id}-message`}
                className={cn(field, "min-h-[128px] resize-y leading-[1.5]")}
                placeholder="Tell us a little about your project or question…"
                maxLength={2000}
                value={draft.message}
                onChange={(e) => set("message", e.target.value)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? `${id}-message-err` : undefined}
              />
              {errors.message && (
                <span id={`${id}-message-err`} className={errorCls}>
                  {errors.message}
                </span>
              )}
            </div>
            {/* Honeypot: hidden from people, irresistible to bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] size-px opacity-0"
              value={draft.website}
              onChange={(e) => set("website", e.target.value)}
            />

            {failure && (
              <p role="alert" className={cn("rounded-2xl px-4 py-3 text-[14px]", light ? "bg-[#b00045]/10 text-[#b00045]" : "bg-magenta/15 text-white")}>
                {failure}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={state === "sending"}
                className={cn(
                  "group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-[15px] font-medium transition-colors disabled:opacity-60",
                  light ? "bg-ink text-white hover:bg-[#222]" : "bg-lime text-ink hover:bg-white",
                )}
              >
                {state === "sending" ? "Sending…" : "Send message"}
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-full transition-transform duration-500 ease-expo group-hover:translate-x-0.5",
                    light ? "bg-lime text-ink" : "bg-ink text-lime",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                    <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              <a
                href={whatsappUrl(waText)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-full border py-3.5 pl-4 pr-5 text-[15px] font-medium transition-colors duration-300 hover:border-[#25d366] hover:bg-[#25d366] hover:text-[#06210f]",
                  light ? "border-ink/20 text-ink" : "border-white/20 text-white",
                )}
              >
                <WhatsAppIcon className="size-[18px]" />
                WhatsApp instead
              </a>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
