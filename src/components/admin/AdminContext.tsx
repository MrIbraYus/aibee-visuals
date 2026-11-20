"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AdminState } from "@/app/admin/actions";
import type { SiteContent } from "@/lib/content/types";

export type View =
  | { name: "overview" }
  | { name: "projects" }
  | { name: "project"; id: string }
  | { name: "hero" }
  | { name: "brands" }
  | { name: "motion" }
  | { name: "briefs" };

type Toast = { id: number; tone: "ok" | "error"; text: string };
type ConfirmRequest = { title: string; body?: string; action: string; danger?: boolean; resolve: (ok: boolean) => void };

type Ctx = {
  state: AdminState;
  content: SiteContent;
  setContent: (updater: (c: SiteContent) => SiteContent) => void;
  view: View;
  go: (v: View) => void;
  toast: (text: string, tone?: "ok" | "error") => void;
  confirm: (opts: Omit<ConfirmRequest, "resolve">) => Promise<boolean>;
  canWrite: boolean;
  canUpload: boolean;
};

const AdminCtx = createContext<Ctx | null>(null);

export const useAdmin = () => {
  const c = useContext(AdminCtx);
  if (!c) throw new Error("useAdmin must be used inside <AdminProvider>");
  return c;
};

const toHash = (v: View) => (v.name === "project" ? `#project/${v.id}` : v.name === "overview" ? "#" : `#${v.name}`);

function fromHash(hash: string): View {
  const h = hash.replace(/^#/, "");
  if (h.startsWith("project/")) return { name: "project", id: h.slice(8) };
  if (["projects", "hero", "brands", "motion", "briefs"].includes(h)) return { name: h } as View;
  return { name: "overview" };
}

export function AdminProvider({ initial, children }: { initial: AdminState; children: ReactNode }) {
  const [content, setContentState] = useState<SiteContent>(initial.content ?? { projects: [], brands: [] });
  const [view, setView] = useState<View>(() => (typeof window === "undefined" ? { name: "overview" } : fromHash(window.location.hash)));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    const onHash = () => setView(fromHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((v: View) => {
    const hash = toHash(v);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash === "#" ? window.location.pathname : hash);
    setView(v);
    window.scrollTo({ top: 0 });
  }, []);

  const toast = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, tone, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3200);
  }, []);

  const confirm = useCallback(
    (opts: Omit<ConfirmRequest, "resolve">) => new Promise<boolean>((resolve) => setConfirmReq({ ...opts, resolve })),
    [],
  );

  const setContent = useCallback((updater: (c: SiteContent) => SiteContent) => setContentState(updater), []);

  const value = useMemo<Ctx>(
    () => ({
      state: initial,
      content,
      setContent,
      view,
      go,
      toast,
      confirm,
      canWrite: initial.storage !== "readonly",
      canUpload: initial.media !== "none",
    }),
    [initial, content, setContent, view, go, toast, confirm],
  );

  return (
    <AdminCtx.Provider value={value}>
      {children}

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              role="status"
              className={`pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-[14px] shadow-2xl ${
                t.tone === "ok" ? "bg-lime text-ink" : "bg-magenta text-white"
              }`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmReq && (
          <motion.div
            className="fixed inset-0 z-[130] grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6"
            >
              <h2 id="confirm-title" className="text-[20px] font-semibold tracking-[-0.02em]">
                {confirmReq.title}
              </h2>
              {confirmReq.body && <p className="mt-2 text-[14px] leading-[1.5] text-muted">{confirmReq.body}</p>}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    confirmReq.resolve(false);
                    setConfirmReq(null);
                  }}
                  className="rounded-full border border-line px-5 py-2.5 text-[14px] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmReq.resolve(true);
                    setConfirmReq(null);
                  }}
                  className={`rounded-full px-5 py-2.5 text-[14px] font-medium ${confirmReq.danger ? "bg-magenta text-white" : "bg-lime text-ink"}`}
                >
                  {confirmReq.action}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminCtx.Provider>
  );
}
