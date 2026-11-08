"use client";

import { useState } from "react";
import { api, refreshAll, useBlocks, useTasks } from "@/lib/client";
import { parseHHMM, toHHMM } from "@/lib/time";
import type { Energy, Task } from "@/lib/types";
import { Field } from "./ui";

export type SlotDraft = {
  start_min: number;
  end_min: number;
  block_id: string;
  task_id: string | null;
  label: string | null;
  energy: Energy;
};

/** Edit one slot's time, block, task and energy. Used by Plan and Schedule. */
export function SlotFields({ value, onChange }: { value: SlotDraft; onChange: (v: SlotDraft) => void }) {
  const { data: blocks } = useBlocks();
  const block = blocks?.find((b) => b.id === value.block_id);
  const set = (p: Partial<SlotDraft>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start">
          <input type="time" step={900} className="input" value={toHHMM(value.start_min)}
            onChange={(e) => e.target.value && set({ start_min: parseHHMM(e.target.value) })} />
        </Field>
        <Field label="End">
          <input type="time" step={900} className="input" value={toHHMM(value.end_min)}
            onChange={(e) => e.target.value && set({ end_min: parseHHMM(e.target.value) })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Block">
          <select className="input" value={value.block_id} onChange={(e) => set({ block_id: e.target.value, task_id: null })}>
            {blocks?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Energy">
          <select className="input" value={value.energy} onChange={(e) => set({ energy: e.target.value as Energy })}>
            <option value="deep">◆ deep</option>
            <option value="shallow">◇ shallow (tired ok)</option>
          </select>
        </Field>
      </div>
      {block?.deep_only && value.energy === "shallow" && (
        <p className="text-xs text-danger">{block.name} never goes in tired slots. Reading while tired means falling asleep.</p>
      )}
      <TaskSelect blockId={value.block_id} energy={value.energy} value={value.task_id} onChange={(task_id) => set({ task_id })} />
      <Field label="Phrase it as time on something">
        <input className="input" placeholder={`${Math.round(((value.end_min - value.start_min) / 60) * 10) / 10}h on …`}
          value={value.label ?? ""} onChange={(e) => set({ label: e.target.value || null })} />
      </Field>
    </div>
  );
}

export function TaskSelect({
  blockId, energy, value, onChange,
}: { blockId: string; energy?: Energy; value: string | null; onChange: (id: string | null) => void }) {
  const { data: tasks } = useTasks();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const list = (tasks ?? [])
    .filter((t) => t.block_id === blockId)
    .sort((a, b) => Number(b.energy === energy) - Number(a.energy === energy) || a.sort_order - b.sort_order);

  async function add() {
    if (!title.trim()) return;
    const t = await api<Task>("/api/tasks", "POST", { block_id: blockId, title: title.trim(), energy: energy ?? "deep" });
    await refreshAll();
    onChange(t.id);
    setTitle("");
    setAdding(false);
  }

  return (
    <Field label="Task">
      {adding ? (
        <div className="flex gap-2">
          <input autoFocus className="input" placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
          <button type="button" className="btn" onClick={add}>Add</button>
        </div>
      ) : (
        <select className="input" value={value ?? ""}
          onChange={(e) => (e.target.value === "__new" ? setAdding(true) : onChange(e.target.value || null))}>
          <option value="">— suggest when the slot starts —</option>
          {list.map((t) => (
            <option key={t.id} value={t.id}>{t.energy === "deep" ? "◆" : "◇"} {t.title}</option>
          ))}
          <option value="__new">+ New task…</option>
        </select>
      )}
    </Field>
  );
}
