"use client";

import Link from "next/link";
import { useState } from "react";
import { SlotFields, type SlotDraft } from "@/components/slot-fields";
import { BlockDot, EnergyTag, ErrorNote, Modal, Panel, Spinner, tint } from "@/components/ui";
import { api, blockMap, refreshAll, useBlocks, useDay, useTasks, useTemplates, useWeekStats } from "@/lib/client";
import { addDays, dayLabel, fmtDuration, fmtHours, fmtMin, localDate, weekStart } from "@/lib/time";
import type { Day, DayTemplate, Place, Slot } from "@/lib/types";

/** Evening, ~1 min: pick the day type, give the furthest-behind block the first good slot, assign tasks. */
export default function PlanPage() {
  // Page content only renders in the browser (see Shell), so reading the URL here is safe.
  const [date, setDate] = useState(() =>
    new URLSearchParams(window.location.search).get("today") ? localDate() : addDays(localDate(), 1),
  );
  const { data: dayData } = useDay(date);
  if (!dayData) return <Spinner />;
  return <PlanEditor key={date} date={date} setDate={setDate} existing={dayData} />;
}

const toDraft = ({ start_min, end_min, block_id, task_id, label, energy }: Slot): SlotDraft => ({ start_min, end_min, block_id, task_id, label, energy });

function PlanEditor({ date, setDate, existing }: { date: string; setDate: (d: string) => void; existing: { day: Day | null; slots: Slot[] } }) {
  const { data: templates } = useTemplates();
  const { data: blocks } = useBlocks();
  const { data: tasks } = useTasks();
  const { data: stats } = useWeekStats(weekStart(date));

  const [templateId, setTemplateId] = useState<string | null>(existing.day?.template_id ?? null);
  const [place, setPlace] = useState<Place>(existing.day?.place_default ?? "home");
  const [freeze, setFreeze] = useState(existing.day?.is_freeze ?? false);
  const [slots, setSlots] = useState<SlotDraft[] | null>(existing.slots.length ? existing.slots.map(toDraft) : null);
  const [editing, setEditing] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (!templates || !blocks || !tasks) return <Spinner />;
  const bmap = blockMap(blocks);
  const behind = stats?.furthest_behind ? bmap.get(stats.furthest_behind) : undefined;
  const behindP = stats?.blocks.find((p) => p.block_id === stats.furthest_behind);
  const firstGood = slots?.findIndex((s) => s.energy === "deep" && !bmap.get(s.block_id)?.target_sessions) ?? -1;
  const alreadyFirst = behind && firstGood >= 0 && slots?.[firstGood].block_id === behind.id;

  function pickTemplate(t: DayTemplate) {
    setTemplateId(t.id);
    setPlace(t.place_default);
    setSaved(false);
    setSlots(
      t.slots.map((s) => {
        const top = tasks!.filter((x) => x.block_id === s.block_id).find((x) => x.energy === s.energy);
        return { start_min: s.start, end_min: s.end, block_id: s.block_id, energy: s.energy, task_id: top?.id ?? null, label: null };
      }),
    );
  }

  function giveFirstSlot() {
    if (!behind || !slots || firstGood < 0) return;
    const next = [...slots];
    const swapIdx = next.findIndex((s, i) => i !== firstGood && s.block_id === behind.id);
    const old = next[firstGood].block_id;
    next[firstGood] = { ...next[firstGood], block_id: behind.id, task_id: null, label: null };
    // swap so the displaced block keeps its time
    if (swapIdx >= 0) next[swapIdx] = { ...next[swapIdx], block_id: old, task_id: null, label: null };
    setSlots(next);
  }

  function addSlot() {
    const last = slots?.[slots.length - 1];
    const start = last?.end_min ?? 9 * 60;
    setSlots([...(slots ?? []), { start_min: start, end_min: Math.min(1440, start + 60), block_id: blocks![0].id, task_id: null, label: null, energy: "deep" }]);
    setEditing(slots?.length ?? 0);
  }

  async function save() {
    setError(null);
    try {
      await api(`/api/days/${date}/plan`, "POST", {
        template_id: templateId, place_default: place, is_freeze: freeze,
        slots: [...(slots ?? [])].sort((a, b) => a.start_min - b.start_min),
      });
      await refreshAll();
      setSaved(true);
    } catch (e) {
      setError(e);
    }
  }

  const tired = slots?.filter((s) => s.energy === "shallow" && bmap.get(s.block_id)?.deep_only) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-lg font-semibold">Plan {date === localDate() ? "today" : date === addDays(localDate(), 1) ? "tomorrow" : dayLabel(date)}</h1>
          <p className="text-sm text-muted">{dayLabel(date)} · decide now, not in the moment.</p>
        </div>
        <div className="ml-auto flex gap-1">
          <button className="btn px-2.5" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
          <button className="btn px-2.5" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">›</button>
        </div>
      </div>

      <Panel title="1 · Day type: what's the workout?">
        <div className="grid gap-2 sm:grid-cols-3">
          {templates.map((t) => (
            <button key={t.id} onClick={() => pickTemplate(t)}
              className={`card p-3 text-left transition ${templateId === t.id ? "ring-2 ring-accent" : "hover:bg-surface-2"}`}>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-muted">{t.description}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={place === "outside"} onChange={(e) => setPlace(e.target.checked ? "outside" : "home")} />
            Working outside home
          </label>
          <label className="flex items-center gap-2" title="Planned off day: the streak is frozen, not broken">
            <input type="checkbox" checked={freeze} onChange={(e) => setFreeze(e.target.checked)} />
            🧊 Off day (freeze streak)
          </label>
        </div>
      </Panel>

      {behind && behindP && (
        <div className="card flex flex-wrap items-center gap-3 p-4" style={{ background: tint(behind.color, 0.12) }}>
          <div className="text-sm">
            <b>{behind.name}</b> is furthest behind this week
            <span className="text-muted">
              {" "}({behindP.target_sessions ? `${behindP.sessions}/${behindP.target_sessions} sessions` : `${fmtHours(behindP.minutes)} of ${fmtHours(behindP.target_minutes ?? 0)}`})
            </span>
            {alreadyFirst ? <span className="text-ok"> — it has the first good slot ✓</span> : "."}
          </div>
          {slots && !alreadyFirst && firstGood >= 0 && (
            <button className="btn ml-auto" onClick={giveFirstSlot}>Give it the first good slot</button>
          )}
        </div>
      )}

      <Panel title="2 · Slots: time on something" action={slots && <button className="btn px-2.5 py-1" onClick={addSlot}>+ Slot</button>}>
        {!slots ? (
          <p className="text-sm text-muted">Pick a day type to fill the schedule, or <button className="text-accent hover:underline" onClick={addSlot}>start from scratch</button>.</p>
        ) : (
          <ul className="space-y-2">
            {slots.map((s, i) => {
              const b = bmap.get(s.block_id);
              const t = tasks.find((x) => x.id === s.task_id);
              return (
                <li key={i} className="flex items-center gap-3 rounded-lg border-l-4 p-2 pl-3" style={{ borderColor: b?.color, background: tint(b?.color ?? "#888", 0.1) }}>
                  <div className="w-24 shrink-0 text-sm tabular-nums text-muted">{fmtMin(s.start_min)}–{fmtMin(s.end_min)}</div>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(i)}>
                    <div className="flex items-center gap-2 text-sm font-medium"><BlockDot block={b} />{b?.name} <EnergyTag energy={s.energy} /></div>
                    <div className="truncate text-sm text-muted">
                      {s.label || `${fmtDuration(s.end_min - s.start_min)} on ${t?.title ?? b?.name.toLowerCase()}`}
                    </div>
                  </button>
                  <button className="btn btn-ghost px-2 text-muted" aria-label="Remove slot" onClick={() => setSlots(slots.filter((_, j) => j !== i))}>✕</button>
                </li>
              );
            })}
          </ul>
        )}
        {tired.length > 0 && <p className="mt-2 text-xs text-danger">Learning never goes in tired slots. Switch those to deep or another block.</p>}
      </Panel>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary px-6 py-2.5" onClick={save} disabled={!slots && !freeze}>Save plan</button>
        {saved && <span className="text-sm text-ok">Planned ✓ <Link href="/schedule" className="text-accent hover:underline">See schedule</Link></span>}
        <ErrorNote error={error} />
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Slot">
        {editing !== null && slots?.[editing] && (
          <div className="space-y-4">
            <SlotFields value={slots[editing]} onChange={(v) => setSlots(slots.map((s, j) => (j === editing ? v : s)))} />
            <button className="btn btn-primary w-full" onClick={() => setEditing(null)}>Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
