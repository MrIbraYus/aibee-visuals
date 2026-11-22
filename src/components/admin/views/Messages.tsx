"use client";

import { useEffect, useState } from "react";
import { deleteMessage, getInquiries, getPushKey, sendTestPush, setMessageStatus, subscribeToPush, unsubscribeFromPush } from "@/app/admin/actions";
import type { Inquiry } from "@/lib/content/types";
import { contactKind } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { useAdmin } from "../AdminContext";
import { Button, EmptyState, Icon, PageHeader } from "../ui";

/** International WhatsApp number from what the visitor typed (Ghana numbers starting with 0 get 233). */
function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `233${digits.slice(1)}`;
  return digits;
}

function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function MessagesView() {
  const { toast, confirm, setUnread, inboxVersion } = useAdmin();
  const [list, setList] = useState<Inquiry[] | null>(null);
  const [filter, setFilter] = useState<"all" | "new">("all");

  useEffect(() => {
    let alive = true;
    getInquiries().then((res) => {
      if (!alive) return;
      if (res.ok) {
        setList(res.data);
        setUnread(res.data.filter((m) => m.status === "new").length);
      } else {
        toast(res.error, "error");
        setList([]);
      }
    });
    return () => {
      alive = false;
    };
  }, [toast, setUnread, inboxVersion]);

  const patch = (next: Inquiry[]) => {
    setList(next);
    setUnread(next.filter((m) => m.status === "new").length);
  };

  const setStatus = async (m: Inquiry, status: "new" | "read") => {
    if (!list || m.status === status) return;
    patch(list.map((x) => (x.id === m.id ? { ...x, status } : x)));
    const res = await setMessageStatus(m.id, status);
    if (!res.ok) toast(res.error, "error");
  };

  const markAllRead = async () => {
    if (!list) return;
    const unread = list.filter((m) => m.status === "new");
    patch(list.map((m) => ({ ...m, status: "read" })));
    const results = await Promise.all(unread.map((m) => setMessageStatus(m.id, "read")));
    const failed = results.find((r) => !r.ok);
    if (failed && !failed.ok) toast(failed.error, "error");
  };

  const remove = async (m: Inquiry) => {
    const ok = await confirm({ title: `Delete the message from ${m.name}?`, body: "This can't be undone.", action: "Delete", danger: true });
    if (!ok || !list) return;
    const res = await deleteMessage(m.id);
    if (!res.ok) return toast(res.error, "error");
    patch(list.filter((x) => x.id !== m.id));
    toast("Message deleted");
  };

  const unreadCount = list?.filter((m) => m.status === "new").length ?? 0;
  const shown = (list ?? []).filter((m) => filter === "all" || m.status === "new");

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Messages sent from the website's contact form. New ones are highlighted. Turn on notifications to hear about them on this device."
        actions={
          unreadCount > 0 ? (
            <Button tone="outline" onClick={markAllRead}>
              <Icon name="check" /> Mark all as read
            </Button>
          ) : undefined
        }
      />

      <NotificationsPanel />

      <div className="mb-4 mt-6 flex gap-1 rounded-full border border-line p-1 text-[13px] sm:w-fit">
        {(
          [
            ["all", `All${list ? ` · ${list.length}` : ""}`],
            ["new", `Unread${unreadCount ? ` · ${unreadCount}` : ""}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={cn("flex-1 rounded-full px-4 py-2 transition-colors sm:flex-none", filter === key ? "bg-white text-ink" : "text-white/70 hover:text-white")}
          >
            {label}
          </button>
        ))}
      </div>

      {list === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          title={filter === "new" ? "You're all caught up" : "No messages yet"}
          body={filter === "new" ? "Every message has been read." : "When someone sends a message from the website, it appears here."}
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <MessageCard key={m.id} m={m} onStatus={(s) => setStatus(m, s)} onDelete={() => remove(m)} />
          ))}
        </ul>
      )}
    </>
  );
}

function MessageCard({ m, onStatus, onDelete }: { m: Inquiry; onStatus: (s: "new" | "read") => void; onDelete: () => void }) {
  const contact = (m.contact ?? m.email ?? "").trim();
  const kind = contact ? contactKind(contact) : null;
  const first = m.name.split(/\s+/)[0];
  const unread = m.status === "new";
  const replyText = `Hi ${first}, thanks for your message to Aibee Visuals!`;

  return (
    <li
      className={cn(
        "relative rounded-3xl border bg-surface p-4 sm:p-6",
        unread ? "border-lime/50 shadow-[0_0_0_1px_rgba(183,245,0,0.15)]" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[17px] font-semibold">
            {unread && <span className="size-2 shrink-0 rounded-full bg-lime" aria-label="Unread" />}
            <span className="truncate">{m.name}</span>
            {m.company && <span className="truncate font-normal text-muted">· {m.company}</span>}
          </p>
          {contact && <p className="mt-0.5 break-all text-[14px] text-white/70">{contact}</p>}
        </div>
        <time className="text-[12px] text-dim" dateTime={new Date(m.createdAt).toISOString()} title={new Date(m.createdAt).toLocaleString()}>
          {timeAgo(m.createdAt)}
        </time>
      </div>

      {(m.topic || m.services?.length || m.budget) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.topic && <span className="rounded-full bg-blue/20 px-2.5 py-1 text-[12px] text-white">About: {m.topic}</span>}
          {m.services?.map((s) => (
            <span key={s} className="rounded-full bg-lime/15 px-2.5 py-1 text-[12px] text-lime">
              {s}
            </span>
          ))}
          {m.budget && <span className="rounded-full border border-line px-2.5 py-1 text-[12px]">{m.budget}</span>}
          {m.timeline && <span className="rounded-full border border-line px-2.5 py-1 text-[12px]">{m.timeline}</span>}
        </div>
      )}

      <p className="mt-4 whitespace-pre-line break-words text-[15px] leading-[1.6] text-white/90">{m.message}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {kind === "phone" && (
          <a
            href={`https://wa.me/${waNumber(contact)}?text=${encodeURIComponent(replyText)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onStatus("read")}
            className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2.5 text-[13px] font-medium text-[#06210f]"
          >
            <Icon name="whatsapp" className="size-4" /> Reply on WhatsApp
          </a>
        )}
        {kind === "phone" && (
          <a href={`tel:${contact.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[13px] hover:border-white/40">
            Call
          </a>
        )}
        {kind === "email" && (
          <a
            href={`mailto:${contact}?subject=${encodeURIComponent("Re: your message to Aibee Visuals")}&body=${encodeURIComponent(`${replyText}\n\n`)}`}
            onClick={() => onStatus("read")}
            className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-[13px] font-medium text-ink"
          >
            <Icon name="mail" className="size-4" /> Reply by email
          </a>
        )}
        <Button className="px-3.5 text-[13px]" onClick={() => onStatus(unread ? "read" : "new")}>
          {unread ? "Mark as read" : "Mark as unread"}
        </Button>
        <Button tone="danger" className="ml-auto px-3" onClick={onDelete} aria-label={`Delete message from ${m.name}`}>
          <Icon name="trash" />
        </Button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Push notifications on this device                                   */
/* ------------------------------------------------------------------ */

type PushState = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "busy";

function base64ToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${browser}`;
}

async function activeRegistration() {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/admin" });
  if (reg.active) return reg;
  const worker = reg.installing ?? reg.waiting;
  await new Promise<void>((resolve) => {
    if (!worker) return resolve();
    worker.addEventListener("statechange", () => worker.state === "activated" && resolve());
  });
  return reg;
}

/** Whether this device can get notifications, and whether it already does. */
async function detectPushState(): Promise<PushState> {
  const ios = /iPhone|iPad/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return ios && !standalone ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/admin");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

function NotificationsPanel() {
  const { toast } = useAdmin();
  const [state, setState] = useState<PushState>("checking");

  useEffect(() => {
    let alive = true;
    detectPushState()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  const turnOn = async () => {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return toast("Notifications weren't allowed.", "error");
      }
      const key = await getPushKey();
      if (!key.ok || !key.data) {
        setState("off");
        return toast(key.ok ? "Notifications need the database connected." : key.error, "error");
      }
      const reg = await activeRegistration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(key.data) }));
      const res = await subscribeToPush(sub.toJSON(), deviceLabel());
      if (!res.ok) throw new Error(res.error);
      setState("on");
      toast("Notifications are on for this device");
    } catch (err) {
      setState("off");
      toast(err instanceof Error ? err.message : "Couldn't turn on notifications.", "error");
    }
  };

  const turnOff = async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/admin");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast("Notifications are off for this device");
    } catch {
      setState(await detectPushState().catch(() => "unsupported" as const));
    }
  };

  const test = async () => {
    const res = await sendTestPush();
    if (!res.ok) return toast(res.error, "error");
    toast(res.data ? `Test sent to ${res.data} device${res.data > 1 ? "s" : ""}` : "No devices have notifications on yet.", res.data ? "ok" : "error");
  };

  const copy: Record<PushState, string> = {
    checking: "Checking this device…",
    unsupported: "This browser can't show notifications. Try Chrome, Edge or Firefox, or the dashboard on your phone.",
    "ios-install": "On iPhone: tap Share → Add to Home Screen, open Aibee Visuals from your home screen, go to the dashboard, then turn notifications on here.",
    denied: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.",
    off: "Get a notification on this device whenever someone sends a message, even when the dashboard is closed.",
    on: "This device gets a notification for every new message.",
    busy: "One moment…",
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", state === "on" ? "bg-lime text-ink" : "bg-white/[0.06] text-lime")}>
          <Icon name="bell" />
        </span>
        <div>
          <p className="text-[15px] font-semibold">{state === "on" ? "Notifications are on" : "Message notifications"}</p>
          <p className="mt-0.5 max-w-[56ch] text-[13px] leading-[1.5] text-muted">{copy[state]}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {state === "on" && (
          <>
            <Button tone="outline" onClick={test}>
              Send a test
            </Button>
            <Button onClick={turnOff}>Turn off</Button>
          </>
        )}
        {(state === "off" || state === "busy") && (
          <Button tone="primary" onClick={turnOn} disabled={state === "busy"}>
            <Icon name="bell" /> Turn on notifications
          </Button>
        )}
      </div>
    </div>
  );
}
