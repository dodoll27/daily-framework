"use client";

import { useMemo, useRef, useState } from "react";
import { api, blockMap, refreshAll, useBlocks, useDay, useNow, useSessions, useSlots, useTasks } from "@/lib/client";
import { reflow, snap } from "@/lib/schedule";
import { addDays, dayLabel, fmtDuration, fmtMin, localDate, minutesNow, parseDate, sessionMinutes } from "@/lib/time";
import type { Block, Session, Slot, Task } from "@/lib/types";
import { SlotFields, type SlotDraft } from "./slot-fields";
import { Modal, Spinner, tint } from "./ui";

const PX = 1; // pixels per minute in day view
const MIN_LEN = 15;

type Drag = { id: string; mode: "move" | "resize"; y0: number; start0: number; end0: number; moved: boolean };

function range(slots: Pick<Slot, "start_min" | "end_min">[], pad = 60) {
  let lo = 8 * 60;
  let hi = 20 * 60;
  for (const s of slots) {
    lo = Math.min(lo, s.start_min - pad);
    hi = Math.max(hi, s.end_min + pad);
  }
  return [Math.max(0, Math.floor(lo / 60) * 60), Math.min(1440, Math.ceil(hi / 60) * 60)] as const;
}

/** Local minutes-from-midnight of a session on `date`. */
function sessionSpan(s: Session, date: string, nowMs: number) {
  const day0 = parseDate(date).getTime();
  const start = (Date.parse(s.started_at) - day0) / 60000;
  const end = start + sessionMinutes(s, nowMs);
  return [Math.max(0, start), Math.min(1440, end)] as const;
}

/** The day as a timeline of slots, coloured by block. Drag to move, drag the bottom edge to resize. */
export function DaySchedule({ date, compact = false }: { date: string; compact?: boolean }) {
  const { data, mutate } = useDay(date);
  const { data: blocks } = useBlocks();
  const { data: tasks } = useTasks();
  const { data: sessions } = useSessions(date, date);
  const now = useNow();
  const bmap = blockMap(blocks);
  const tmap = new Map((tasks ?? []).map((t) => [t.id, t]));

  const [drag, setDrag] = useState<Drag | null>(null);
  const [preview, setPreview] = useState<Slot[] | null>(null);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [adding, setAdding] = useState<SlotDraft | null>(null);
  const colRef = useRef<HTMLDivElement>(null);

  const slots = preview ?? data?.slots ?? [];
  const [lo, hi] = range(data?.slots ?? []);
  const isToday = date === localDate(now);
  const nowMin = minutesNow(now);

  function onPointerDown(e: React.PointerEvent, s: Slot, mode: Drag["mode"]) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: s.id, mode, y0: e.clientY, start0: s.start_min, end0: s.end_min, moved: false });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag || !data) return;
    const dy = (e.clientY - drag.y0) / PX;
    if (!drag.moved && Math.abs(dy) < 4) return;
    let start = drag.start0;
    let end = drag.end0;
    if (drag.mode === "move") {
      const len = drag.end0 - drag.start0;
      start = Math.max(0, Math.min(1440 - len, snap(drag.start0 + dy)));
      end = start + len;
    } else {
      end = Math.min(1440, Math.max(drag.start0 + MIN_LEN, snap(drag.end0 + dy)));
    }
    const base = data.slots.map((x) => (x.id === drag.id ? { ...x, start_min: start, end_min: end } : x));
    const shifted = new Map(reflow(base, drag.id).map((x) => [x.id, x]));
    setPreview(base.map((x) => shifted.get(x.id) ?? x));
    if (!drag.moved) setDrag({ ...drag, moved: true });
  }

  async function onPointerUp() {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) {
      setPreview(null);
      const s = data?.slots.find((x) => x.id === d.id);
      if (s) setEditing(s);
      return;
    }
    const s = preview?.find((x) => x.id === d.id);
    if (s && (s.start_min !== d.start0 || s.end_min !== d.end0)) {
      await mutate({ day: data!.day, slots: preview! }, false);
      await api(`/api/slots/${d.id}`, "PATCH", { start_min: s.start_min, end_min: s.end_min });
      await refreshAll();
    }
    setPreview(null);
  }

  function startAdd() {
    const last = [...(data?.slots ?? [])].sort((a, b) => b.end_min - a.end_min)[0];
    const start = last ? last.end_min : isToday ? Math.min(1380, snap(nowMin, 30)) : 9 * 60;
    setAdding({ start_min: start, end_min: Math.min(1440, start + 60), block_id: blocks?.[0]?.id ?? "", task_id: null, label: null, energy: "deep" });
  }

  if (!data || !blocks) return <Spinner />;

  const hours = [];
  for (let m = lo; m <= hi; m += 60) hours.push(m);

  return (
    <div>
      {slots.length === 0 && (
        <p className="mb-3 text-sm text-muted">Nothing planned. <a className="text-accent hover:underline" href="/plan">Plan this day</a> or add a slot.</p>
      )}
      <div
        ref={colRef}
        className="relative ml-10"
        style={{ height: (hi - lo) * PX }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (setDrag(null), setPreview(null))}
      >
        {hours.map((m) => (
          <div key={m} className="absolute inset-x-0 border-t border-border" style={{ top: (m - lo) * PX }}>
            <span className="absolute -top-2 -left-10 w-8 text-right text-[11px] text-muted tabular-nums">{fmtMin(m)}</span>
          </div>
        ))}

        {/* actual time logged, as a thin strip on the right */}
        {(sessions ?? []).map((s) => {
          const [a, b] = sessionSpan(s, date, now.getTime());
          if (b <= lo || a >= hi) return null;
          return (
            <div key={s.id} className="absolute right-0 w-1.5 rounded-full" title={`${bmap.get(s.block_id)?.name}: ${fmtDuration(b - a)} logged`}
              style={{ top: (Math.max(a, lo) - lo) * PX, height: Math.max(2, (Math.min(b, hi) - Math.max(a, lo)) * PX), background: bmap.get(s.block_id)?.color }} />
          );
        })}

        {slots.map((s) => (
          <SlotCard key={s.id} slot={s} block={bmap.get(s.block_id)} task={s.task_id ? tmap.get(s.task_id) : undefined}
            top={(s.start_min - lo) * PX} height={(s.end_min - s.start_min) * PX} compact={compact}
            dragging={drag?.id === s.id} active={isToday && nowMin >= s.start_min && nowMin < s.end_min}
            onPointerDown={onPointerDown} />
        ))}

        {isToday && nowMin >= lo && nowMin <= hi && (
          <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-danger" style={{ top: (nowMin - lo) * PX }}>
            <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-danger" />
          </div>
        )}
      </div>

      <button className="btn mt-3 w-full" onClick={startAdd}>+ Add slot</button>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit slot">
        {editing && <SlotEditor slot={editing} onDone={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!adding} onClose={() => setAdding(null)} title="Add slot">
        {adding && (
          <div className="space-y-4">
            <SlotFields value={adding} onChange={setAdding} />
            <button className="btn btn-primary w-full" onClick={async () => {
              await api("/api/slots", "POST", { ...adding, date });
              setAdding(null);
              await refreshAll();
            }}>Add</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SlotCard({
  slot, block, task, top, height, compact, dragging, active, onPointerDown,
}: {
  slot: Slot; block?: Block; task?: Task; top: number; height: number; compact: boolean;
  dragging: boolean; active: boolean;
  onPointerDown: (e: React.PointerEvent, s: Slot, mode: Drag["mode"]) => void;
}) {
  const color = block?.color ?? "#888";
  const done = slot.status === "honoured" || slot.status === "adjusted";
  return (
    <div
      className={`no-select absolute right-3 left-0 z-10 cursor-grab overflow-hidden rounded-lg border-l-4 px-2 py-1 text-sm active:cursor-grabbing ${dragging ? "shadow-lg ring-2 ring-accent" : ""} ${active ? "ring-2 ring-fg/30" : ""} ${slot.status === "skipped" ? "opacity-40" : ""}`}
      style={{ top, height: Math.max(height - 2, 18), background: tint(color, done ? 0.3 : 0.16), borderColor: color }}
      onPointerDown={(e) => onPointerDown(e, slot, "move")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">
          {block?.name}
          {slot.energy === "shallow" && <span className="ml-1 text-xs text-muted">◇</span>}
          {done && <span className="ml-1 text-xs text-ok">✓</span>}
        </span>
        <span className="shrink-0 text-[11px] text-muted tabular-nums">
          {fmtMin(slot.start_min)}–{fmtMin(slot.end_min)}
        </span>
      </div>
      {!compact && height > 36 && (
        <div className="truncate text-xs text-muted">{slot.label || task?.title || `${fmtDuration(slot.end_min - slot.start_min)} on ${block?.name.toLowerCase()}`}</div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" onPointerDown={(e) => onPointerDown(e, slot, "resize")} />
    </div>
  );
}

function SlotEditor({ slot, onDone }: { slot: Slot; onDone: () => void }) {
  const [draft, setDraft] = useState<SlotDraft>(slot);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refreshAll();
      onDone();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <SlotFields value={draft} onChange={setDraft} />
      <div className="flex gap-2">
        <button className="btn text-danger" disabled={busy} onClick={() => run(() => api(`/api/slots/${slot.id}`, "DELETE"))}>Delete</button>
        <button className="btn btn-primary flex-1" disabled={busy} onClick={() => run(() => api(`/api/slots/${slot.id}`, "PATCH", draft))}>Save</button>
      </div>
    </div>
  );
}

/** The week as seven compact timelines. */
export function WeekSchedule({ start, onPick }: { start: string; onPick?: (date: string) => void }) {
  const end = addDays(start, 6);
  const { data: slots } = useSlots(start, end);
  const { data: blocks } = useBlocks();
  const now = useNow();
  const bmap = blockMap(blocks);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  if (!slots || !blocks) return <Spinner />;
  const [lo, hi] = range(slots, 0);
  const scale = 0.5;
  const today = localDate(now);

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => (
        <button key={d} className={`rounded-md py-1 text-center text-xs ${d === today ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2"}`} onClick={() => onPick?.(d)}>
          {dayLabel(d, { weekday: "short" })} {parseDate(d).getDate()}
        </button>
      ))}
      {days.map((d) => (
        <div key={d} className="relative rounded-md bg-surface-2/60" style={{ height: (hi - lo) * scale }} onClick={() => onPick?.(d)}>
          {slots.filter((s) => s.date === d).map((s) => {
            const b = bmap.get(s.block_id);
            return (
              <div key={s.id} className="absolute inset-x-0.5 overflow-hidden rounded-sm border-l-2 px-0.5 text-[10px] leading-tight"
                title={`${b?.name} ${fmtMin(s.start_min)}–${fmtMin(s.end_min)}`}
                style={{ top: (s.start_min - lo) * scale, height: Math.max(4, (s.end_min - s.start_min) * scale - 1), background: tint(b?.color ?? "#888", 0.25), borderColor: b?.color }}>
                <span className="hidden sm:inline">{b?.name}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
