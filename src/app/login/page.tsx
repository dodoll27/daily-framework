"use client";

import { useState } from "react";
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
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold">Daily Framework</h1>
          <p className="text-sm text-muted">The plan is the default.</p>
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
        {msg && <p className="text-sm text-muted">{msg}</p>}
        <div className="flex justify-between text-sm text-muted">
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
