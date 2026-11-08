"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useMe } from "@/lib/client";
import { Scribble } from "./collage";
import { StreakBadge } from "./week";

const NAV = [
  { href: "/", label: "Now", icon: "●" },
  { href: "/schedule", label: "Schedule", icon: "▤" },
  { href: "/plan", label: "Plan", icon: "☾" },
  { href: "/review", label: "Review", icon: "✓" },
  { href: "/week", label: "Week", icon: "▦" },
  { href: "/tasks", label: "Tasks", icon: "☰" },
];

const noop = () => () => {};
/** True only in the browser: the app is all about "now", so nothing date-based is prerendered. */
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const mounted = useMounted();
  useMe(); // seeds defaults for brand-new accounts

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b-2 border-fg bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4">
          <Link href="/" className="group relative flex items-baseline gap-1.5 leading-none">
            <span className="font-display text-3xl italic">Daily</span>
            <span className="cutout -translate-y-1 rotate-[-3deg] bg-accent text-[0.6rem]">framework</span>
            <Scribble className="absolute -bottom-2 left-0 h-2.5 w-16 transition-[width] group-hover:w-24" />
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((n, i) => {
              const active = path === n.href;
              return (
                <Link key={n.href} href={n.href}
                  className={`px-2.5 py-1 font-mono text-[13px] tracking-tight transition ${active ? "highlight text-fg" : "text-muted hover:text-fg"}`}
                  style={active ? { rotate: `${i % 2 ? 1 : -1}deg` } : undefined}>
                  {n.label.toLowerCase()}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {mounted && <StreakBadge />}
            <Link href="/settings" className={`font-mono text-[13px] ${path === "/settings" ? "highlight" : "text-muted hover:text-fg"}`}>settings</Link>
            <button onClick={signOut} className="font-hand hidden text-lg text-muted hover:text-fg sm:block">sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-28 md:pb-12">{mounted ? children : null}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t-2 border-fg bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ backgroundImage: "var(--grain)", backgroundBlendMode: "multiply" }}>
        {NAV.map((n) => {
          const active = path === n.href;
          return (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 font-mono text-[10px] ${active ? "text-fg" : "text-muted"}`}>
              <span className={`text-base leading-none ${active ? "text-accent" : ""}`}>{n.icon}</span>
              <span className={active ? "highlight" : ""}>{n.label.toLowerCase()}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
