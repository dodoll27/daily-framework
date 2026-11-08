"use client";

import { useState } from "react";
import { ErrorNote, Field, Panel, Spinner } from "@/components/ui";
import { api, refreshAll, useBlocks, useTemplates } from "@/lib/client";
import { parseHHMM, toHHMM } from "@/lib/time";
import type { Block, DayTemplate, TemplateSlot } from "@/lib/types";

export default function SettingsPage() {
  const { data: blocks } = useBlocks();
  const { data: templates } = useTemplates();
  if (!blocks || !templates) return <Spinner />;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Panel title="Blocks & weekly targets"
        action={<button className="btn px-2.5 py-1" onClick={async () => (await api("/api/blocks", "POST", { name: "New block", weekly_target_minutes: 60, sort_order: blocks.length }), refreshAll())}>+ Block</button>}>
        <p className="mb-3 text-sm text-muted">Targets are starting points. Shift them as life shifts (e.g. job search grows when interviews pile up).</p>
        <div className="space-y-3">{blocks.map((b) => <BlockRow key={JSON.stringify(b)} block={b} />)}</div>
      </Panel>
      <Panel title="Day templates"
        action={<button className="btn px-2.5 py-1" onClick={async () => (await api("/api/templates", "POST", { name: "New template", slots: [], sort_order: templates.length }), refreshAll())}>+ Template</button>}>
        <p className="mb-3 text-sm text-muted">A template is a default, not a rule. Any slot can still be moved on the day.</p>
        <div className="space-y-4">{templates.map((t) => <TemplateEditor key={JSON.stringify(t)} template={t} blocks={blocks} />)}</div>
      </Panel>
    </div>
  );
}

function BlockRow({ block }: { block: Block }) {
  const [b, setB] = useState(block);
  const [error, setError] = useState<unknown>(null);
  const bySessions = b.target_sessions !== null;
  const dirty = JSON.stringify(b) !== JSON.stringify(block);
  async function save() {
    try {
      await api(`/api/blocks/${b.id}`, "PATCH", b);
      refreshAll();
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="rounded-lg bg-surface-2/60 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <input type="color" className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent" value={b.color} onChange={(e) => setB({ ...b, color: e.target.value })} aria-label="Colour" />
        <div className="min-w-32 flex-1"><Field label="Name"><input className="input" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field></div>
        <Field label="Target by">
          <select className="input w-auto" value={bySessions ? "sessions" : "hours"}
            onChange={(e) => setB(e.target.value === "sessions" ? { ...b, target_sessions: 4, weekly_target_minutes: null } : { ...b, target_sessions: null, weekly_target_minutes: 300 })}>
            <option value="hours">hours</option>
            <option value="sessions">sessions</option>
          </select>
        </Field>
        <div className="w-24">
          <Field label={bySessions ? "Sessions / wk" : "Hours / wk"}>
            <input type="number" min={0} step={bySessions ? 1 : 0.5} className="input"
              value={bySessions ? (b.target_sessions ?? 0) : (b.weekly_target_minutes ?? 0) / 60}
              onChange={(e) => setB(bySessions ? { ...b, target_sessions: Number(e.target.value) } : { ...b, weekly_target_minutes: Math.round(Number(e.target.value) * 60) })} />
          </Field>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5" title="Streak floor: one slot of this block + any other session keeps the streak">
          <input type="checkbox" checked={b.is_floor} onChange={(e) => setB({ ...b, is_floor: e.target.checked })} /> Streak floor
        </label>
        <label className="flex items-center gap-1.5" title="Warn when planned in a tired (shallow) slot">
          <input type="checkbox" checked={b.deep_only} onChange={(e) => setB({ ...b, deep_only: e.target.checked })} /> Never when tired
        </label>
        <label className="flex items-center gap-1.5" title="Can be suggested as furthest behind">
          <input type="checkbox" checked={b.prioritize} onChange={(e) => setB({ ...b, prioritize: e.target.checked })} /> Suggest when behind
        </label>
        <span className="ml-auto flex gap-2">
          <button className="btn btn-ghost text-danger" onClick={async () => {
            if (window.confirm(`Delete ${block.name}? Its tasks, slots and sessions go too.`)) {
              await api(`/api/blocks/${b.id}`, "DELETE");
              refreshAll();
            }
          }}>Delete</button>
          <button className="btn btn-primary" disabled={!dirty} onClick={save}>Save</button>
        </span>
      </div>
      <ErrorNote error={error} />
    </div>
  );
}

function TemplateEditor({ template, blocks }: { template: DayTemplate; blocks: Block[] }) {
  const [t, setT] = useState(template);
  const dirty = JSON.stringify(t) !== JSON.stringify(template);
  const setSlot = (i: number, p: Partial<TemplateSlot>) => setT({ ...t, slots: t.slots.map((s, j) => (j === i ? { ...s, ...p } : s)) });

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <Field label="Name"><input className="input" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></Field>
        <Field label="Description"><input className="input" value={t.description ?? ""} onChange={(e) => setT({ ...t, description: e.target.value })} /></Field>
        <Field label="Place">
          <select className="input" value={t.place_default} onChange={(e) => setT({ ...t, place_default: e.target.value as DayTemplate["place_default"] })}>
            <option value="home">Home</option><option value="outside">Outside</option>
          </select>
        </Field>
      </div>
      <ul className="mt-3 space-y-1.5">
        {t.slots.map((s, i) => (
          <li key={i} className="flex flex-wrap items-center gap-1.5">
            <input type="time" step={900} className="input w-28" value={toHHMM(s.start)} onChange={(e) => e.target.value && setSlot(i, { start: parseHHMM(e.target.value) })} aria-label="Start" />
            <input type="time" step={900} className="input w-28" value={toHHMM(s.end)} onChange={(e) => e.target.value && setSlot(i, { end: parseHHMM(e.target.value) })} aria-label="End" />
            <select className="input w-auto flex-1" value={s.block_id} onChange={(e) => setSlot(i, { block_id: e.target.value })} aria-label="Block">
              {blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="input w-auto" value={s.energy} onChange={(e) => setSlot(i, { energy: e.target.value as TemplateSlot["energy"] })} aria-label="Energy">
              <option value="deep">◆ deep</option><option value="shallow">◇ shallow</option>
            </select>
            <button className="btn btn-ghost px-2 text-muted" onClick={() => setT({ ...t, slots: t.slots.filter((_, j) => j !== i) })} aria-label="Remove slot">✕</button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <button className="btn" onClick={() => {
          const last = t.slots[t.slots.length - 1];
          const start = last?.end ?? 540;
          setT({ ...t, slots: [...t.slots, { start, end: Math.min(1440, start + 60), block_id: blocks[0].id, energy: "deep" }] });
        }}>+ Slot</button>
        <button className="btn btn-ghost ml-auto text-danger" onClick={async () => {
          if (window.confirm(`Delete template ${template.name}?`)) {
            await api(`/api/templates/${t.id}`, "DELETE");
            refreshAll();
          }
        }}>Delete</button>
        <button className="btn btn-primary" disabled={!dirty} onClick={async () => (await api(`/api/templates/${t.id}`, "PATCH", t), refreshAll())}>Save</button>
      </div>
    </div>
  );
}
