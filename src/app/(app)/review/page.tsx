"use client";

import { useState } from "react";
import { LogForm } from "@/components/now";
import { BlockDot, Modal, Panel, Spinner } from "@/components/ui";
import { api, blockMap, refreshAll, useBlocks, useDay, useSessions, useTasks } from "@/lib/client";
import { addDays, dayLabel, fmtDuration, fmtMin, localDate, minutesNow, sessionMinutes, wallToIso } from "@/lib/time";
import type { Day, Session, Slot } from "@/lib/types";

const MOODS = ["😩", "😕", "😐", "🙂", "😄"];

/** ~30 s: planned vs actual per slot, one tap to confirm or adjust. No "failed" state. */
export default function ReviewPage() {
  const [date, setDate] = useState(() => (minutesNow() < 6 * 60 ? addDays(localDate(), -1) : localDate()));
  const { data: dayData } = useDay(date);
  const { data: sessions } = useSessions(date, date);
  const { data: blocks } = useBlocks();
  const { data: tasks } = useTasks();
  const [adjusting, setAdjusting] = useState<Slot | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  if (!dayData || !sessions || !blocks) return <Spinner />;
  const bmap = blockMap(blocks);
  const actualFor = (slot: Slot) => sessions.filter((s) => s.slot_id === slot.id).reduce((a, s) => a + sessionMinutes(s), 0);
  const offPlan = sessions.filter((s) => !s.slot_id || !dayData.slots.some((x) => x.id === s.slot_id));
  const honoured = sessions.reduce((a, s) => a + sessionMinutes(s), 0);
  const planned = dayData.slots.reduce((a, s) => a + s.end_min - s.start_min, 0);

  async function confirm(slot: Slot) {
    const actual = actualFor(slot);
    const gap = Math.round(slot.end_min - slot.start_min - actual);
    if (gap > 0) {
      const start = slot.start_min + Math.round(actual);
      await api("/api/sessions", "POST", {
        block_id: slot.block_id, task_id: slot.task_id, slot_id: slot.id, source: "manual",
        place: dayData!.day?.place_default ?? "home",
        started_at: wallToIso(date, start), ended_at: wallToIso(date, start + gap),
      });
    }
    await api(`/api/slots/${slot.id}`, "PATCH", { status: "honoured" });
    await refreshAll();
  }

  async function setStatus(slot: Slot, status: Slot["status"]) {
    await api(`/api/slots/${slot.id}`, "PATCH", { status });
    await refreshAll();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-4xl leading-none">Review</h1>
          <p className="font-hand mt-1 text-xl text-muted">{dayLabel(date)}</p>
        </div>
        <div className="ml-auto flex gap-1">
          <button className="btn px-2.5" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
          <button className="btn px-2.5" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">›</button>
        </div>
      </div>

      <div className="card taped torn halftone relative -rotate-1 p-6 text-center">
        <div className="font-display text-7xl leading-none tabular-nums">{fmtDuration(honoured)}</div>
        <div className="font-hand mt-1 text-2xl"><span className="highlight">time honoured</span>{planned ? <span className="text-muted"> · of {fmtDuration(planned)} planned</span> : ""}</div>
      </div>

      <Panel title="Slots">
        {dayData.slots.length === 0 && <p className="text-sm text-muted">No slots planned for this day.</p>}
        <ul className="space-y-2">
          {dayData.slots.map((s) => {
            const b = bmap.get(s.block_id);
            const actual = actualFor(s);
            const plan = s.end_min - s.start_min;
            const t = tasks?.find((x) => x.id === s.task_id);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 border border-fg/15 border-l-[5px] bg-surface p-3" style={{ borderLeftColor: b?.color }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="font-mono text-[12px] font-bold uppercase">{b?.name}</span>
                    <span className="font-mono text-[11px] font-normal text-muted tabular-nums">{fmtMin(s.start_min)}–{fmtMin(s.end_min)}</span>
                  </div>
                  <div className="font-display truncate text-xl leading-tight">{s.label || t?.title}</div>
                  <div className="mt-1 text-sm tabular-nums">
                    <span className={actual >= plan * 0.9 ? "text-ok" : ""}>{fmtDuration(actual)}</span>
                    <span className="text-muted"> / {fmtDuration(plan)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {s.status === "planned" ? (
                    <>
                      <button className="btn btn-primary" onClick={() => confirm(s)} title="Yes, I gave it the planned time">✓</button>
                      <button className="btn" onClick={() => setAdjusting(s)}>Adjust</button>
                      <button className="btn btn-ghost text-muted" onClick={() => setStatus(s, "skipped")}>Skip</button>
                    </>
                  ) : (
                    <>
                      <span className="chip">{s.status === "honoured" ? "✓ honoured" : s.status === "adjusted" ? "✎ adjusted" : "skipped"}</span>
                      <button className="btn btn-ghost px-2 text-xs text-muted" onClick={() => setStatus(s, "planned")}>undo</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Off-plan time" action={<button className="btn px-2.5 py-1" onClick={() => setLogOpen(true)}>+ Log</button>}>
        {offPlan.length === 0 ? (
          <p className="text-sm text-muted">Nothing off-plan.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {offPlan.map((s: Session) => (
              <li key={s.id} className="flex items-center gap-2">
                <BlockDot block={bmap.get(s.block_id)} /> {bmap.get(s.block_id)?.name}
                <span className="truncate text-muted">{tasks?.find((t) => t.id === s.task_id)?.title}</span>
                <span className="ml-auto tabular-nums">{fmtDuration(sessionMinutes(s))}</span>
                <button className="text-muted hover:text-danger" aria-label="Delete session"
                  onClick={async () => (await api(`/api/sessions/${s.id}`, "DELETE"), refreshAll())}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Reflection key={`${date}:${dayData.day?.review_done}`} date={date} day={dayData.day} />

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title="How much time did it get?">
        {adjusting && <Adjust slot={adjusting} sessions={sessions.filter((s) => s.slot_id === adjusting.id)} date={date}
          place={dayData.day?.place_default ?? "home"} onDone={() => setAdjusting(null)} />}
      </Modal>
      <Modal open={logOpen} onClose={() => setLogOpen(false)} title="Log time">
        <LogForm blocks={blocks} date={date} place={dayData.day?.place_default ?? "home"} onDone={() => (setLogOpen(false), refreshAll())} />
      </Modal>
    </div>
  );
}

function Adjust({ slot, sessions, date, place, onDone }: { slot: Slot; sessions: Session[]; date: string; place: string; onDone: () => void }) {
  const tracked = sessions.filter((s) => s.source !== "manual").reduce((a, s) => a + sessionMinutes(s), 0);
  const current = sessions.reduce((a, s) => a + sessionMinutes(s), 0);
  const [minutes, setMinutes] = useState(Math.round(current));
  const plan = slot.end_min - slot.start_min;

  async function save() {
    await Promise.all(sessions.filter((s) => s.source === "manual").map((s) => api(`/api/sessions/${s.id}`, "DELETE")));
    const extra = Math.round(minutes - tracked);
    if (extra > 0) {
      await api("/api/sessions", "POST", {
        block_id: slot.block_id, task_id: slot.task_id, slot_id: slot.id, source: "manual", place,
        started_at: wallToIso(date, slot.start_min), ended_at: wallToIso(date, slot.start_min + extra),
      });
    }
    await api(`/api/slots/${slot.id}`, "PATCH", { status: "adjusted" });
    await refreshAll();
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[0.25, 0.5, 0.75, 1, 1.25].map((f) => (
          <button key={f} className={`btn ${minutes === Math.round(plan * f) ? "ring-2 ring-accent" : ""}`} onClick={() => setMinutes(Math.round(plan * f))}>
            {fmtDuration(plan * f)}
          </button>
        ))}
      </div>
      <input type="range" min={0} max={plan * 2} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full" />
      <div className="text-center text-2xl font-semibold tabular-nums">{fmtDuration(minutes)}</div>
      {tracked > 0 && <p className="text-xs text-muted">{fmtDuration(tracked)} was tracked by the timer.</p>}
      <button className="btn btn-primary w-full" onClick={save}>Save</button>
    </div>
  );
}

/** Optional mood / energy note, then mark the day reviewed. */
function Reflection({ date, day }: { date: string; day: Day | null }) {
  const [note, setNote] = useState(day?.energy_note ?? "");
  const [mood, setMood] = useState<number | null>(day?.mood ?? null);
  const done = day?.review_done ?? false;
  async function finish() {
    await api(`/api/days/${date}`, "PUT", { review_done: true, energy_note: note || null, mood });
    await refreshAll();
  }
  return (
    <>
      <Panel title="How was it? (optional)">
        <div className="mb-3 flex gap-2">
          {MOODS.map((m, i) => (
            <button key={m} className={`rounded-lg p-1.5 text-2xl ${mood === i + 1 ? "bg-surface-2 ring-2 ring-accent" : "opacity-60 hover:opacity-100"}`}
              onClick={() => setMood(mood === i + 1 ? null : i + 1)} aria-label={`Mood ${i + 1}`}>{m}</button>
          ))}
        </div>
        <textarea className="input min-h-16" placeholder="Energy note…" value={note} onChange={(e) => setNote(e.target.value)} />
      </Panel>
      <button className="btn btn-primary w-full py-3" onClick={finish}>{done ? "Reviewed ✓ (save again)" : "Done for today"}</button>
    </>
  );
}
