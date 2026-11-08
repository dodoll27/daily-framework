"use client";

import { useEffect } from "react";
import type { Block, Energy } from "@/lib/types";

export function BlockDot({ block, className = "" }: { block?: Block; className?: string }) {
  return (
    <span
      className={`inline-block size-3 shrink-0 rotate-12 border border-fg/60 ${className}`}
      style={{ background: block?.color ?? "var(--muted)", clipPath: "polygon(8% 0, 100% 10%, 90% 100%, 0 88%)" }}
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
    // a marker swipe on a dotted strip, with a pencil tick for "pace"
    <div className="halftone relative h-3.5 w-full border-y border-fg/15">
      <div
        className="absolute inset-y-[-2px] left-0 transition-[width] duration-500 mix-blend-multiply"
        style={{
          width: `${Math.min(100, value * 100)}%`,
          background: color,
          opacity: 0.85,
          clipPath: "polygon(0 12%, 100% 0, 99% 50%, 100% 92%, 0 100%, 1% 55%)",
        }}
      />
      {expected !== undefined && expected > 0 && expected < 1 && (
        <div className="absolute -inset-y-1.5 w-[2px] rotate-6 bg-fg" style={{ left: `${expected * 100}%` }} title="Pace for today" />
      )}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
  tape = true,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tape?: boolean;
}) {
  return (
    <section className={`card p-4 pt-5 ${tape ? "taped" : ""} ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="cutout -ml-1">{title}</h2>}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#3a2f1f]/35 p-0 pt-6 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="card taped max-h-[90dvh] w-full max-w-md overflow-y-auto p-5 sm:-rotate-[0.6deg]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl leading-none">{title}</h2>
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
      <span className="font-mono text-[11px] tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

export function Spinner() {
  return <div className="font-hand py-8 text-center text-xl text-muted">sorting the scraps…</div>;
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
