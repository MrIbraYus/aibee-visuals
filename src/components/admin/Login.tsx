"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { signInWithGoogle, signInWithPassword, type AdminState } from "@/app/admin/actions";
import { LogoMark } from "@/components/brand/Logo";
import { getFirebaseApp } from "@/lib/firebase";
import { Button, inputCls } from "./ui";

export function Login({ state, onSuccess }: { state: AdminState; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const noMethod = !state.login.google && !state.login.password;

  const pinLength = state.login.pinLength;
  const pinRef = useRef<HTMLInputElement>(null);

  const tryLogin = async (value: string) => {
    setBusy(true);
    setError(null);
    const res = await signInWithPassword(value);
    setBusy(false);
    if (res.ok) return onSuccess();
    setError(res.error);
    setPassword("");
    pinRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password) await tryLogin(password);
  };

  /** PIN boxes: digits only, signs in as soon as the last digit is typed. */
  const onPin = (raw: string) => {
    if (!pinLength) return;
    const digits = raw.replace(/\D/g, "").slice(0, pinLength);
    setPassword(digits);
    setError(null);
    if (digits.length === pinLength && !busy) void tryLogin(digits);
  };

  const google = async () => {
    const app = getFirebaseApp();
    if (!app) return setError("Firebase isn't configured in this environment.");
    setBusy(true);
    setError(null);
    try {
      const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import("firebase/auth");
      const auth = getAuth(app);
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const res = await signInWithGoogle(await cred.user.getIdToken());
      await signOut(auth);
      if (res.ok) onSuccess();
      else setError(res.error);
    } catch {
      setError("Google sign-in was cancelled or failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-svh place-items-center bg-ink px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <div>
            <p className="font-logo text-[18px] leading-none">
              <span className="font-extrabold">Aibee</span> Visuals
            </p>
            <p className="mt-1 text-[13px] text-muted">Studio dashboard</p>
          </div>
        </div>

        <h1 className="mt-10 text-[36px] font-semibold leading-[1] tracking-[-0.04em]">
          Welcome <span className="serif-i font-normal">back.</span>
        </h1>
        <p className="mt-3 text-[14px] text-muted">Sign in to manage your work, hero images, brands and motion.</p>

        {noMethod && (
          <p className="mt-8 rounded-2xl border border-magenta/40 bg-magenta/10 p-4 text-[14px] leading-[1.5]">
            No dashboard PIN is set up yet. Run <code className="text-lime">npm run admin:pin -- 1234</code> (with your
            own PIN) or add <code className="text-lime">ADMIN_PASSWORD</code> to your environment, then reload.
          </p>
        )}

        {state.login.google && (
          <Button tone="outline" className="mt-8 w-full py-3.5" onClick={google} disabled={busy}>
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1S8.7 5.9 12 5.9c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6z" />
            </svg>
            Continue with Google
          </Button>
        )}

        {state.login.google && state.login.password && (
          <div className="my-6 flex items-center gap-3 text-[12px] text-dim">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        )}

        {state.login.password && !!pinLength && (
          <div className={state.login.google ? "" : "mt-8"}>
            <label htmlFor="admin-password" className="block text-[12px] font-medium uppercase tracking-[0.06em] text-muted">
              Enter your PIN
            </label>
            <div className="relative mt-3" onClick={() => pinRef.current?.focus()}>
              <input
                id="admin-password"
                ref={pinRef}
                value={password}
                onChange={(e) => onPin(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="current-password"
                maxLength={pinLength}
                autoFocus
                disabled={busy}
                aria-label={`${pinLength}-digit PIN`}
                className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
              />
              <div className={`flex gap-3 ${error ? "animate-[shake_0.4s_ease]" : ""}`} aria-hidden>
                {Array.from({ length: pinLength }, (_, i) => {
                  const filled = i < password.length;
                  const current = i === password.length && !busy;
                  return (
                    <span
                      key={i}
                      className={`grid h-16 flex-1 place-items-center rounded-2xl border text-[28px] transition-colors ${
                        error ? "border-magenta" : current ? "border-lime" : "border-line"
                      } bg-ink/60`}
                    >
                      {filled ? <span className="size-3.5 rounded-full bg-white" /> : null}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-[13px] text-muted">{busy ? "Checking…" : "You'll be signed in as soon as the PIN is complete."}</p>
          </div>
        )}

        {state.login.password && !pinLength && (
          <form onSubmit={submit} className={state.login.google ? "" : "mt-8"}>
            <label className="block text-[12px] font-medium uppercase tracking-[0.06em] text-muted" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} mt-2`}
              placeholder="••••••••"
              autoFocus
            />
            <Button tone="primary" type="submit" className="mt-4 w-full py-3.5" disabled={busy || !password}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 text-[14px] text-magenta">
            {error}
          </p>
        )}

        <Link href="/" className="mt-10 inline-block text-[13px] text-muted hover:text-white">
          ← Back to the website
        </Link>
      </div>
    </main>
  );
}
