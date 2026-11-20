"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { budgets, DISCOVERY_FEE_GHS, projectServices, timelines } from "@/content/project";
import { closeProjectDrawer, lenisStore, useProjectDrawer } from "@/lib/store";
import { inquirySchema, type InquiryInput } from "@/lib/validation";
import { ArrowUpRight, PillButton } from "@/components/ui/Primitives";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { LogoMark } from "@/components/brand/Logo";
import { formatBrief, mailtoUrl, whatsappUrl } from "@/lib/contact";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

type Draft = {
  services: InquiryInput["services"];
  budget: InquiryInput["budget"] | "";
  timeline: InquiryInput["timeline"] | "";
  name: string;
  email: string;
  company: string;
  message: string;
  website: string;
};

const emptyDraft: Draft = {
  services: [],
  budget: "",
  timeline: "",
  name: "",
  email: "",
  company: "",
  message: "",
  website: "",
};

type Phase = "form" | "done";
type PayState = "idle" | "loading" | "paid" | "error";

const STEP_FIELDS: (keyof Draft)[][] = [["services"], ["budget", "timeline"], ["name", "email", "message"]];

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2.5 text-[14px] transition-all duration-300",
        selected ? "border-lime bg-lime text-ink" : "border-line text-white/85 hover:border-white/50",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12px] uppercase tracking-[0.08em] text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-magenta">{error}</span>}
    </label>
  );
}

const inputCls =
  "mt-2 w-full border-b border-line bg-transparent pb-3 text-[17px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-lime";

export function ProjectDrawer() {
  const open = useProjectDrawer();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [phase, setPhase] = useState<Phase>("form");
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [pay, setPay] = useState<PayState>("idle");
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const lenis = lenisStore.get();
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeProjectDrawer();
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("button, input, textarea")?.focus(), 400);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      lenis?.start();
    };
  }, [open]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleService = (s: InquiryInput["services"][number]) => {
    setDraft((d) => ({
      ...d,
      services: d.services.includes(s) ? d.services.filter((x) => x !== s) : [...d.services, s],
    }));
    setErrors((e) => ({ ...e, services: undefined }));
  };

  const validateStep = (s: number) => {
    const result = inquirySchema.safeParse(draft);
    if (result.success) return true;
    const fields = STEP_FIELDS[s];
    const next: Partial<Record<keyof Draft, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof Draft;
      if (fields.includes(key) && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const nextStep = () => validateStep(step) && setStep((s) => Math.min(2, s + 1));

  const briefText = () => formatBrief({ ...draft, company: draft.company || undefined });

  /** Keep a copy on the server (Firestore + optional automatic WhatsApp alert). */
  const saveCopy = () => {
    fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
      keepalive: true,
    })
      .then((res) => res.json() as Promise<{ id?: string; payments?: boolean }>)
      .then((data) => {
        // Only offer the paid discovery session when Paystack is set up.
        if (data.id && data.payments) setInquiryId(data.id);
      })
      .catch(() => {});
  };

  /** Hands the finished brief to the studio's WhatsApp, pre-filled and ready to send. */
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(2)) return;
    const url = whatsappUrl(briefText());
    // Opened synchronously inside the click so pop-up blockers allow it.
    const win = window.open(url, "_blank");
    if (win) win.opener = null;
    else window.location.href = url;
    saveCopy();
    setPhase("done");
  };

  const sendByEmail = () => {
    if (!validateStep(2)) return;
    window.location.href = mailtoUrl(`New project brief — ${draft.name}`, briefText());
    saveCopy();
    setPhase("done");
  };

  const payDeposit = async () => {
    if (!inquiryId) return;
    setPay("loading");
    setPayMsg(null);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId, email: draft.email, name: draft.name }),
      });
      const data = (await res.json()) as { accessCode?: string; error?: string };
      if (!res.ok || !data.accessCode) throw new Error(data.error ?? "Payments are unavailable right now.");
      const { default: PaystackPop } = await import("@paystack/inline-js");
      const popup = new PaystackPop();
      popup.resumeTransaction(data.accessCode, {
        onSuccess: async (tx) => {
          const v = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(tx.reference)}`);
          const vd = (await v.json()) as { status?: string };
          if (vd.status === "success") {
            setPay("paid");
          } else {
            setPay("error");
            setPayMsg("We couldn't confirm the payment yet — we'll follow up by email.");
          }
        },
        onCancel: () => setPay("idle"),
        onError: (error) => {
          setPay("error");
          setPayMsg(error.message);
        },
      });
    } catch (err) {
      setPay("error");
      setPayMsg(err instanceof Error ? err.message : "Payment failed to start.");
    }
  };

  const reset = () => {
    closeProjectDrawer();
    window.setTimeout(() => {
      setStep(0);
      setDraft(emptyDraft);
      setErrors({});
      setPhase("form");
      setInquiryId(null);
      setPay("idle");
      setPayMsg(null);
    }, 600);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={phase === "done" ? reset : closeProjectDrawer}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            ref={panelRef}
            data-lenis-prevent
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.9, ease }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[600px] flex-col overflow-y-auto border-l border-line bg-surface sm:inset-y-3 sm:right-3 sm:rounded-[28px] sm:border"
          >
            <div className="flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-9">
              <LogoMark className="size-9" />
              <button
                type="button"
                onClick={phase === "done" ? reset : closeProjectDrawer}
                className="grid size-11 place-items-center rounded-full border border-line transition-colors hover:bg-white hover:text-ink"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {phase !== "done" ? (
              <form onSubmit={submit} noValidate className="flex flex-1 flex-col px-6 pb-8 sm:px-10 sm:pb-10">
                <h2 id="drawer-title" className="mt-8 text-[clamp(32px,4vw,44px)] font-semibold leading-[1.02] tracking-[-0.04em]">
                  Let&apos;s build something <span className="serif-i font-normal">that matters.</span>
                </h2>

                {/* progress */}
                <div className="mt-8 flex gap-2" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <motion.span
                        className="block h-full origin-left bg-lime"
                        animate={{ scaleX: step >= i ? 1 : 0 }}
                        transition={{ duration: 0.6, ease }}
                      />
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-muted">Step {step + 1} of 3</p>

                <div className="relative mt-8 flex-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.45, ease }}
                    >
                      {step === 0 && (
                        <fieldset>
                          <legend className="text-[18px] font-medium">What can we help with?</legend>
                          <div className="mt-5 flex flex-wrap gap-2.5">
                            {projectServices.map((s) => (
                              <Chip
                                key={s}
                                selected={draft.services.includes(s)}
                                onClick={() => toggleService(s)}
                              >
                                {s}
                              </Chip>
                            ))}
                          </div>
                          {errors.services && <p className="mt-3 text-[12px] text-magenta">{errors.services}</p>}
                        </fieldset>
                      )}

                      {step === 1 && (
                        <div className="space-y-9">
                          <fieldset>
                            <legend className="text-[18px] font-medium">Budget</legend>
                            <div className="mt-5 flex flex-wrap gap-2.5">
                              {budgets.map((b) => (
                                <Chip key={b} selected={draft.budget === b} onClick={() => update("budget", b)}>
                                  {b}
                                </Chip>
                              ))}
                            </div>
                            {errors.budget && <p className="mt-3 text-[12px] text-magenta">Choose a budget range</p>}
                          </fieldset>
                          <fieldset>
                            <legend className="text-[18px] font-medium">Timeline</legend>
                            <div className="mt-5 flex flex-wrap gap-2.5">
                              {timelines.map((t) => (
                                <Chip key={t} selected={draft.timeline === t} onClick={() => update("timeline", t)}>
                                  {t}
                                </Chip>
                              ))}
                            </div>
                            {errors.timeline && <p className="mt-3 text-[12px] text-magenta">Choose a timeline</p>}
                          </fieldset>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-7">
                          <div className="grid gap-7 sm:grid-cols-2">
                            <Field label="Your name" error={errors.name}>
                              <input
                                className={inputCls}
                                value={draft.name}
                                onChange={(e) => update("name", e.target.value)}
                                autoComplete="name"
                                placeholder="Ama Mensah"
                              />
                            </Field>
                            <Field label="Email" error={errors.email}>
                              <input
                                className={inputCls}
                                type="email"
                                value={draft.email}
                                onChange={(e) => update("email", e.target.value)}
                                autoComplete="email"
                                placeholder="you@company.com"
                              />
                            </Field>
                          </div>
                          <Field label="Company (optional)">
                            <input
                              className={inputCls}
                              value={draft.company}
                              onChange={(e) => update("company", e.target.value)}
                              autoComplete="organization"
                              placeholder="Your brand"
                            />
                          </Field>
                          <Field label="Tell us about it" error={errors.message}>
                            <textarea
                              className={cn(inputCls, "min-h-[110px] resize-none")}
                              value={draft.message}
                              onChange={(e) => update("message", e.target.value)}
                              placeholder="Goals, audience, what success looks like…"
                            />
                          </Field>
                          {/* honeypot */}
                          <input
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden
                            className="hidden"
                            value={draft.website}
                            onChange={(e) => update("website", e.target.value)}
                          />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-10 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    className={cn("text-[14px] text-muted transition-opacity hover:text-white", step === 0 && "pointer-events-none opacity-0")}
                  >
                    ← Back
                  </button>
                  {step < 2 ? (
                    <PillButton onClick={nextStep}>Continue</PillButton>
                  ) : (
                    <button
                      type="submit"
                      className="group inline-flex items-center gap-3 rounded-full bg-[#25d366] px-6 py-4 text-[14px] font-semibold text-[#06210f] transition-transform duration-300 hover:scale-[1.03]"
                    >
                      <WhatsAppIcon className="size-5" />
                      Send brief on WhatsApp
                    </button>
                  )}
                </div>
                {step === 2 && (
                  <p className="mt-5 text-right text-[13px] text-muted">
                    Prefer email?{" "}
                    <button type="button" onClick={sendByEmail} className="text-white underline underline-offset-4 hover:text-lime">
                      Send it to our inbox
                    </button>
                  </p>
                )}
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease }}
                className="flex flex-1 flex-col px-6 pb-10 sm:px-10"
              >
                <div className="mt-10 grid size-16 place-items-center rounded-full bg-lime text-ink">
                  <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
                    <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 id="drawer-title" className="mt-8 text-[clamp(32px,4vw,44px)] font-semibold leading-[1.02] tracking-[-0.04em]">
                  Thank you, {draft.name.split(" ")[0]}. <span className="serif-i font-normal">Almost there.</span>
                </h2>
                <p className="mt-5 text-[16px] leading-[1.6] text-muted">
                  Your brief is waiting in WhatsApp — just tap send and it lands straight on our phone. We reply to every
                  project personally.
                </p>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
                  <a href={whatsappUrl(briefText())} target="_blank" rel="noopener noreferrer" className="text-[#25d366] underline underline-offset-4">
                    WhatsApp didn&apos;t open? Tap here
                  </a>
                  <a href={mailtoUrl(`New project brief — ${draft.name}`, briefText())} className="text-white/80 underline underline-offset-4">
                    Email it instead
                  </a>
                </div>

                {inquiryId && (
                <div className="mt-10 rounded-3xl border border-line bg-ink/60 p-6">
                  <p className="text-[18px] font-medium">Book a 60-minute discovery session</p>
                  <p className="mt-2 text-[14px] leading-[1.55] text-muted">
                    A strategy call with our creative lead. The GH₵{DISCOVERY_FEE_GHS.toLocaleString()} fee is credited to your
                    project if we work together. Secure payment by Paystack.
                  </p>
                  <div className="mt-6">
                    {pay === "paid" ? (
                      <p className="flex items-center gap-2 text-[15px] text-lime">
                        Payment received — check your inbox for the booking link.
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={payDeposit}
                        disabled={pay === "loading"}
                        className="group inline-flex items-center gap-3 rounded-full border border-white/30 px-6 py-3.5 text-[14px] font-medium transition-colors hover:bg-white hover:text-ink disabled:opacity-60"
                      >
                        {pay === "loading" ? "Opening Paystack…" : `Pay GH₵${DISCOVERY_FEE_GHS.toLocaleString()} & book`}
                        <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:rotate-45" />
                      </button>
                    )}
                    {payMsg && <p className="mt-3 text-[13px] text-magenta">{payMsg}</p>}
                  </div>
                </div>
                )}

                <div className="mt-auto pt-10">
                  <button type="button" onClick={reset} className="text-[14px] text-muted hover:text-white">
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
