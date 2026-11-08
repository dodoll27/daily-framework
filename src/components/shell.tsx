"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useMe } from "@/lib/client";
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
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="font-semibold">Daily Framework</Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className={`rounded-lg px-3 py-1.5 text-sm ${path === n.href ? "bg-surface-2 font-medium" : "text-muted hover:text-fg"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {mounted && <StreakBadge />}
            <Link href="/settings" className={`text-sm ${path === "/settings" ? "text-fg" : "text-muted hover:text-fg"}`} aria-label="Settings">⚙</Link>
            <button onClick={signOut} className="hidden text-sm text-muted hover:text-fg sm:block">Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-24 md:pb-8">{mounted ? children : null}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center py-2 text-[11px] ${path === n.href ? "text-accent" : "text-muted"}`}>
            <span className="text-base leading-none">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
