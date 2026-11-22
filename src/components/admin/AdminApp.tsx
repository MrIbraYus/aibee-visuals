"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAdminState, signOut, type AdminState } from "@/app/admin/actions";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { AdminProvider, useAdmin, type View } from "./AdminContext";
import { Login } from "./Login";
import { Icon } from "./ui";
import { Overview } from "./views/Overview";
import { ProjectsView } from "./views/Projects";
import { ProjectEditor } from "./views/ProjectEditor";
import { HeroView } from "./views/Hero";
import { BrandsView } from "./views/Brands";
import { MotionView } from "./views/Motion";
import { MessagesView } from "./views/Messages";
import { WebsitesView } from "./views/Websites";
import { TestimonialsView } from "./views/Testimonials";

type NavItem = { view: View["name"]; label: string; icon: Parameters<typeof Icon>[0]["name"] };
const NAV: NavItem[] = [
  { view: "overview", label: "Overview", icon: "grid" },
  { view: "projects", label: "Projects", icon: "folder" },
  { view: "websites", label: "Websites", icon: "globe" },
  { view: "hero", label: "Hero", icon: "star" },
  { view: "brands", label: "Brands", icon: "badge" },
  { view: "motion", label: "Motion", icon: "play" },
  { view: "testimonials", label: "Testimonials", icon: "quote" },
  { view: "messages", label: "Messages", icon: "inbox" },
];
/** Phone bottom bar; the rest live in the top-right menu. */
const TABS: View["name"][] = ["overview", "projects", "websites", "motion", "messages"];

function Badge({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={cn("grid h-[18px] min-w-[18px] place-items-center rounded-full bg-magenta px-1 text-[11px] font-semibold leading-none text-white tabular-nums", className)}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Root of the /admin dashboard: sign-in gate + responsive shell. */
export function AdminApp() {
  const [state, setState] = useState<AdminState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setState(await getAdminState());
    } catch (err) {
      setError(err instanceof Error ? err.message : "The dashboard server didn't respond.");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    // Never leave the page spinning: give up after 20s and show why.
    const timer = window.setTimeout(() => alive && setError("The dashboard is taking too long to respond."), 20000);
    getAdminState()
      .then((s) => alive && setState(s))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "The dashboard server didn't respond."))
      .finally(() => window.clearTimeout(timer));
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (error && !state) {
    return (
      <main className="grid min-h-svh place-items-center bg-ink px-5 text-white">
        <div className="w-full max-w-[420px]">
          <LogoMark className="size-10" />
          <h1 className="mt-8 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em]">The dashboard couldn&apos;t load.</h1>
          <p className="mt-3 break-words rounded-2xl border border-magenta/40 bg-magenta/10 p-4 text-[14px] leading-[1.5]">{error}</p>
          <p className="mt-3 text-[13px] text-muted">
            Check your internet connection. On the live site, make sure the environment variables from .env.local are added in
            Vercel, then redeploy.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-full bg-lime px-5 py-3.5 text-[14px] font-medium text-ink"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <div className="grid min-h-svh place-items-center bg-ink" aria-busy>
        <LogoMark className="size-10 animate-pulse" />
      </div>
    );
  }
  if (!state.authed) return <Login state={state} onSuccess={load} />;

  return (
    <AdminProvider initial={state}>
      <Shell onSignOut={async () => {
        await signOut();
        await load();
      }} />
    </AdminProvider>
  );
}

function ModeBanner() {
  const { state } = useAdmin();
  if (state.storage === "firestore" && state.media === "cloudinary") return null;
  const local = state.storage === "local";
  return (
    <div
      className={cn(
        "mb-6 rounded-2xl border px-4 py-2.5 text-[12px] leading-[1.5] sm:py-3 sm:text-[13px]",
        local ? "border-blue/40 bg-blue/10 text-white/85" : "border-magenta/40 bg-magenta/10",
      )}
    >
      {local ? (
        <>
          <strong className="font-semibold">Local mode.</strong> Saved on this computer
          <span className="hidden sm:inline">
            {" "}(in <code className="text-lime">.data/</code>). Add your Firebase and Cloudinary keys to manage the live site from anywhere.
          </span>
          <span className="sm:hidden">. Connect Firebase + Cloudinary for the live site.</span>
        </>
      ) : (
        <>
          <strong className="font-semibold">Read-only.</strong> This deployment has no database or media storage connected, so changes
          can&apos;t be saved. Add the Firebase and Cloudinary keys in your hosting settings.
        </>
      )}
    </div>
  );
}

function Shell({ onSignOut }: { onSignOut: () => void }) {
  const { view, go, state, content, unread } = useAdmin();
  const [menu, setMenu] = useState(false);
  const active: View["name"] = view.name === "project" ? "projects" : view.name;

  const counts: Partial<Record<View["name"], number>> = {
    projects: content.projects.length,
    hero: content.projects.flatMap((p) => p.assets).filter((a) => a.hero).length,
    brands: content.brands.length,
    motion: content.projects.flatMap((p) => p.assets).filter((a) => a.type === "motion").length,
    websites: content.websites.length,
    testimonials: content.testimonials.length,
  };

  return (
    <div className="min-h-svh bg-ink text-white lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-line bg-[#0b0b0b] px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <LogoMark className="size-8" />
          <div className="leading-tight">
            <p className="font-logo text-[15px]">
              <span className="font-extrabold">Aibee</span> Visuals
            </p>
            <p className="text-[11px] text-muted">Studio dashboard</p>
          </div>
        </div>
        <nav aria-label="Dashboard" className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => go({ name: item.view } as View)}
              aria-current={active === item.view ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors",
                active === item.view ? "bg-white/[0.08] text-white" : "text-white/65 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              <Icon name={item.icon} className={active === item.view ? "text-lime" : ""} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.view === "messages" ? (
                <Badge n={unread} />
              ) : (
                counts[item.view] !== undefined && <span className="text-[12px] tabular-nums text-dim">{counts[item.view]}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-line pt-4">
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-white/65 hover:bg-white/[0.04] hover:text-white">
            <Icon name="external" /> View website
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-white/65 hover:bg-white/[0.04] hover:text-white"
          >
            <Icon name="logout" /> Sign out
          </button>
          <p className="truncate px-3 pt-2 text-[11px] text-dim">{state.user === "password" ? "Signed in with password" : state.user}</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-ink/90 px-4 backdrop-blur-xl lg:hidden">
        <button type="button" onClick={() => go({ name: "overview" })} className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="font-logo text-[14px]">
            <span className="font-extrabold">Aibee</span> Studio
          </span>
        </button>
        <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="More" className="grid size-10 place-items-center rounded-xl bg-white/5">
          <Icon name={menu ? "close" : "menu"} />
        </button>
      </header>
      {menu && (
        <div className="fixed inset-x-3 top-16 z-50 rounded-2xl border border-line bg-surface p-2 shadow-2xl lg:hidden">
          {NAV.filter((item) => !TABS.includes(item.view)).map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => {
                setMenu(false);
                go({ name: item.view } as View);
              }}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[14px] hover:bg-white/5", active === item.view && "text-lime")}
            >
              <Icon name={item.icon} /> {item.label}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] hover:bg-white/5">
            <Icon name="external" /> View website
          </Link>
          <button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[14px] text-magenta hover:bg-white/5">
            <Icon name="logout" /> Sign out
          </button>
        </div>
      )}

      <main className="min-w-0 px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="mx-auto max-w-[1180px]">
          <ModeBanner />
          {view.name === "overview" && <Overview />}
          {view.name === "projects" && <ProjectsView />}
          {view.name === "project" && <ProjectEditor key={view.id} id={view.id} />}
          {view.name === "hero" && <HeroView />}
          {view.name === "brands" && <BrandsView />}
          {view.name === "motion" && <MotionView />}
          {view.name === "websites" && <WebsitesView />}
          {view.name === "testimonials" && <TestimonialsView />}
          {view.name === "messages" && <MessagesView />}
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {NAV.filter((item) => TABS.includes(item.view)).map((item) => (
          <button
            key={item.view}
            type="button"
            onClick={() => go({ name: item.view } as View)}
            aria-current={active === item.view ? "page" : undefined}
            className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px]", active === item.view ? "text-lime" : "text-white/55")}
          >
            <Icon name={item.icon} className="size-5" />
            {item.label}
            {item.view === "messages" && <Badge n={unread} className="absolute left-1/2 top-1 ml-1.5" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
