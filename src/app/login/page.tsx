"use client";

import { useState } from "react";
import { Scrap, Scribble, Stamp, Star } from "@/components/collage";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = supabaseBrowser();
    const redirect = `${window.location.origin}/auth/callback`;
    const res =
      mode === "magic"
        ? await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } })
        : mode === "signup"
          ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect } })
          : await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (res.error) return setMsg(res.error.message);
    if (mode === "signin" || res.data?.session) {
      window.location.href = "/";
      return;
    }
    setMsg("Check your inbox for the link.");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      {/* collage backdrop */}
      <Scrap color="var(--yellow)" className="top-[12%] left-[8%] h-40 w-56 -rotate-6 opacity-80" />
      <Scrap color="rgba(255,92,138,0.55)" className="right-[6%] bottom-[14%] h-52 w-64 rotate-3" />
      <Scrap color="rgba(43,75,216,0.18)" className="top-[55%] left-[18%] h-24 w-80 rotate-12" />
      <div className="halftone pointer-events-none absolute top-[8%] right-[14%] size-44 rounded-full opacity-70" />
      <Star className="absolute top-[18%] right-[30%] size-10 rotate-12" color="var(--yellow)" />
      <p className="font-hand pointer-events-none absolute bottom-[8%] left-[10%] -rotate-3 text-2xl text-muted">no decisions in the moment.</p>

      <form onSubmit={submit} className="card taped torn relative w-full max-w-sm -rotate-1 space-y-4 p-7">
        <Stamp text="· PLAN · DO · REVIEW · TIME " className="absolute -top-8 -right-8 size-24 rotate-12" color="var(--accent)" />
        <div className="relative">
          <span className="cutout bg-accent">daily framework</span>
          <h1 className="mt-3 text-5xl leading-[0.95]">The plan is <em>the default.</em></h1>
          <Scribble className="mt-1 h-3 w-40" />
        </div>
        <input
          className="input"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== "magic" && (
          <input
            className="input"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "…" : mode === "signup" ? "Create account" : mode === "magic" ? "Email me a link" : "Sign in"}
        </button>
        {msg && <p className="font-hand text-xl text-muted">{msg}</p>}
        <div className="font-hand flex justify-between text-lg text-muted">
          <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="hover:underline">
            {mode === "signup" ? "Have an account? Sign in" : "Create account"}
          </button>
          <button type="button" onClick={() => setMode(mode === "magic" ? "signin" : "magic")} className="hover:underline">
            {mode === "magic" ? "Use password" : "Magic link"}
          </button>
        </div>
      </form>
    </main>
  );
}
