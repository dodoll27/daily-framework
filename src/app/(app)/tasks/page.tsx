"use client";

import { useState } from "react";
import { BlockDot, Panel, Spinner } from "@/components/ui";
import { api, refreshAll, useBlocks, useTasks } from "@/lib/client";
import type { Energy, Task } from "@/lib/types";

/** Task lists per block, tagged deep / shallow. */
export default function TasksPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState<"all" | Energy>("all");
  const { data: blocks } = useBlocks();
  const { data: tasks } = useTasks(showArchived ? "archived" : "open");
  if (!blocks || !tasks) return <Spinner />;

  const visible = tasks.filter((t) => filter === "all" || t.energy === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-4xl leading-none">Tasks</h1>
        <div className="ml-auto flex gap-1 font-mono text-[13px]">
          {(["all", "deep", "shallow"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 ${filter === f ? "highlight text-fg" : "text-muted hover:text-fg"}`}>{f}</button>
          ))}
        </div>
        <button className="btn" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Open tasks" : "Archived"}</button>
      </div>
      <p className="font-hand text-lg leading-snug text-muted">
        <b>Deep</b>: focus or intake (docs, courses, design, interview prep). <b>Shallow</b>: autopilot output (tests, refactors, CSS, forms, follow-ups, flashcards).
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map((b) => (
          <Panel key={b.id} title={<span className="flex items-center gap-2"><BlockDot block={b} />{b.name}</span>}>
            <TaskList tasks={visible.filter((t) => t.block_id === b.id)} archived={showArchived} />
            {!showArchived && <AddTask blockId={b.id} defaultEnergy={filter === "all" ? "shallow" : filter} />}
          </Panel>
        ))}
      </div>
    </div>
  );
}

function TaskList({ tasks, archived }: { tasks: Task[]; archived: boolean }) {
  const patch = async (t: Task, data: Partial<Task>) => (await api(`/api/tasks/${t.id}`, "PATCH", data), refreshAll());
  async function move(i: number, dir: -1 | 1) {
    const a = tasks[i];
    const b = tasks[i + dir];
    if (!b) return;
    await Promise.all([
      api(`/api/tasks/${a.id}`, "PATCH", { sort_order: b.sort_order === a.sort_order ? b.sort_order + dir : b.sort_order }),
      api(`/api/tasks/${b.id}`, "PATCH", { sort_order: a.sort_order }),
    ]);
    refreshAll();
  }
  if (!tasks.length) return <p className="mb-3 text-sm text-muted">Empty.</p>;
  return (
    <ul className="mb-3 divide-y divide-border">
      {tasks.map((t, i) => (
        <li key={t.id} className="group flex items-center gap-2 py-1.5 text-sm">
          <button className="chip w-[5.2rem] shrink-0 justify-center whitespace-nowrap" title="Toggle deep / shallow"
            onClick={() => patch(t, { energy: t.energy === "deep" ? "shallow" : "deep" })}>
            {t.energy === "deep" ? "◆ deep" : "◇ shallow"}
          </button>
          <span className="min-w-0 flex-1 truncate">{t.title}</span>
          <span className="flex gap-0.5 opacity-60 group-hover:opacity-100">
            {!archived && <button className="px-1 text-muted" onClick={() => move(i, -1)} aria-label="Move up">↑</button>}
            {!archived && <button className="px-1 text-muted" onClick={() => move(i, 1)} aria-label="Move down">↓</button>}
            <button className="px-1 text-muted" title={archived ? "Restore" : "Archive"}
              onClick={() => patch(t, { status: archived ? "open" : "archived" })}>{archived ? "↺" : "✓"}</button>
            {archived && (
              <button className="px-1 text-muted hover:text-danger" aria-label="Delete"
                onClick={async () => (await api(`/api/tasks/${t.id}`, "DELETE"), refreshAll())}>✕</button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AddTask({ blockId, defaultEnergy }: { blockId: string; defaultEnergy: Energy }) {
  const [title, setTitle] = useState("");
  const [energy, setEnergy] = useState<Energy>(defaultEnergy);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await api("/api/tasks", "POST", { block_id: blockId, title: title.trim(), energy });
    setTitle("");
    refreshAll();
  }
  return (
    <form onSubmit={add} className="flex gap-2">
      <input className="input" placeholder="Add task…" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className="input w-auto" value={energy} onChange={(e) => setEnergy(e.target.value as Energy)} aria-label="Energy">
        <option value="deep">◆</option>
        <option value="shallow">◇</option>
      </select>
    </form>
  );
}
