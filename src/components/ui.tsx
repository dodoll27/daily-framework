"use client";

import { useEffect } from "react";
import type { Block, Energy } from "@/lib/types";

export function BlockDot({ block, className = "" }: { block?: Block; className?: string }) {
  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full ${className}`}
      style={{ background: block?.color ?? "var(--muted)" }}
    />
  );
}

export function EnergyTag({ energy }: { energy: Energy }) {
  return (
    <span className="chip" title={energy === "deep" ? "Focus or intake" : "Autopilot output"}>
      {energy === "deep" ? "◆ deep" : "◇ shallow"}
    </span>
  );
}

export function ProgressBar({
  value,
  expected,
  color,
}: {
  value: number; // 0..n
  expected?: number; // 0..1, where you "should" be by now
  color: string;
}) {
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, value * 100)}%`, background: color }}
      />
      {expected !== undefined && expected > 0 && expected < 1 && (
        <div className="absolute inset-y-0 w-px bg-fg/40" style={{ left: `${expected * 100}%` }} title="Pace for today" />
      )}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="card max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 sm:rounded-b-[0.875rem]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button className="btn btn-ghost px-2 py-1" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Spinner() {
  return <div className="py-8 text-center text-sm text-muted">Loading…</div>;
}

export function ErrorNote({ error }: { error?: unknown }) {
  if (!error) return null;
  return <p className="text-sm text-danger">{error instanceof Error ? error.message : String(error)}</p>;
}

/** Tint a hex colour for slot backgrounds. */
export function tint(hex: string, alpha = 0.16) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
