"use client";

import { useState } from "react";
import {
  api, blockMap, refreshAll, useBlocks, useDay, useNow, useRunning, useStreak, useTasks,
} from "@/lib/client";
import { fmtDuration, fmtMin, localDate, minutesNow, parseHHMM, sessionMinutes, toHHMM, wallToIso } from "@/lib/time";
import type { Block, Session, Slot, Task } from "@/lib/types";
import { TaskSelect } from "./slot-fields";
import { Arrow, Scrap, Scribble, Stamp } from "./collage";
import { BlockDot, EnergyTag, ErrorNote, Field, Modal, Panel, Spinner, tint } from "./ui";

/** Best task for a slot: the planned one, else the top open task of the block matching the slot's energy. */
export function suggestTask(slot: Slot, tasks: Task[]) {
  if (slot.task_id) {
    const t = tasks.find((x) => x.id === slot.task_id);
    if (t) return t;
  }
  const inBlock = tasks.filter((t) => t.block_id === slot.block_id);
  return inBlock.find((t) => t.energy === slot.energy) ?? inBlock[0];
}

/** Current slot, suggested task, timer, "I'm fried", quick capture. */
export function NowPanel() {
  const now = useNow(1000);
  const today = localDate(now);
  const { data: dayData } = useDay(today);
  const { data: blocks } = useBlocks();
  const { data: tasks } = useTasks();
  const { data: running } = useRunning();
  const [error, setError] = useState<unknown>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  if (!dayData || !blocks || !tasks || running === undefined) return <Panel title="Now"><Spinner /></Panel>;

  const bmap = blockMap(blocks);
  const nowMin = minutesNow(now);
  const slots = dayData.slots.filter((s) => s.status !== "skipped");
  const current = slots.find((s) => nowMin >= s.start_min && nowMin < s.end_min);
  const next = slots.find((s) => s.start_min > nowMin);
  const place = dayData.day?.place_default ?? "home";
  const runningSlot = running?.slot_id ? dayData.slots.find((s) => s.id === running.slot_id) : undefined;
  const suggestion = current ? suggestTask(current, tasks) : undefined;

  async function act(fn: () => Promise<unknown>, msg?: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refreshAll();
      if (msg) {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const start = (slot: Slot | undefined, block_id: string, task_id: string | null) =>
    act(() => api("/api/sessions", "POST", { block_id, task_id, slot_id: slot?.id ?? null, place, source: "timer" }));

  async function stop(s: Session) {
    await act(async () => {
      await api(`/api/sessions/${s.id}`, "PATCH", { stop: true });
      // Running over shifts the rest of the day instead of breaking it.
      const slot = s.slot_id ? dayData!.slots.find((x) => x.id === s.slot_id) : undefined;
      if (slot && slot.date === today && nowMin > slot.end_min) {
        await api(`/api/slots/${slot.id}`, "PATCH", { end_min: Math.min(1440, nowMin) });
      }
    });
  }

  const fried = () =>
    act(async () => {
      const r = await api<{ task: Task }>("/api/fried", "POST", { slot_id: current?.id ?? null, place, skip_task_id: running?.task_id });
      setToast(`Switched to: ${r.task.title}`);
      setTimeout(() => setToast(null), 3500);
    });

  return (
    <Panel title="Now" action={<span className="font-display text-3xl leading-none tabular-nums italic">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}>
      <div className="space-y-4">
        {running ? (
          <RunningCard session={running} block={bmap.get(running.block_id)} task={tasks.find((t) => t.id === running.task_id)}
            slot={runningSlot} nowMin={nowMin} onStop={() => stop(running)} busy={busy} />
        ) : current ? (
          <SlotCardNow slot={current} block={bmap.get(current.block_id)} task={suggestion} nowMin={nowMin}
            onStart={() => start(current, current.block_id, suggestion?.id ?? null)} busy={busy} />
        ) : (
          <div className="halftone relative border border-dashed border-fg/30 p-5">
            <p className="font-display text-2xl">No slot right now.</p>
            <p className="font-hand text-xl text-muted">
              {next ? <>Next: <b>{bmap.get(next.block_id)?.name}</b> at {fmtMin(next.start_min)}.</> : slots.length ? "Day's plan is done." : <>Nothing planned today. <a className="text-accent hover:underline" href="/plan?today=1">Plan today</a>.</>}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button className="btn -rotate-1 bg-pink py-3 text-base text-fg hover:bg-pink" disabled={busy} onClick={fried} title="Swap to the top shallow task. No choice needed.">
            🫠 I&apos;m fried
          </button>
          <button className="btn rotate-[0.6deg] py-3" disabled={busy} onClick={() => setSwitchOpen(true)}>↪ Something else</button>
        </div>

        {toast && <p className="font-hand -rotate-1 bg-yellow px-3 py-1 text-xl shadow-sm">{toast}</p>}
        <ErrorNote error={error} />

        <QuickCapture blocks={blocks} defaultBlock={current?.block_id ?? running?.block_id} />

        {next && (current || running) && (
          <p className="border-t border-dashed border-fg/25 pt-3 text-sm text-muted">
            <span className="font-mono text-[11px] uppercase">up next · {fmtMin(next.start_min)}</span>{" "} <BlockDot block={bmap.get(next.block_id)} /> {bmap.get(next.block_id)?.name}
            {next.label ? ` — ${next.label}` : ""}
          </p>
        )}
        <FloorStatus />
        <button className="font-hand text-lg text-muted underline decoration-pink decoration-wavy underline-offset-4 hover:text-fg" onClick={() => setLogOpen(true)}>+ log time I didn&apos;t track</button>
      </div>

      <Modal open={switchOpen} onClose={() => setSwitchOpen(false)} title="Switch to something else">
        <SwitchForm blocks={blocks} onStart={(b, t) => (setSwitchOpen(false), start(undefined, b, t))} />
      </Modal>
      <Modal open={logOpen} onClose={() => setLogOpen(false)} title="Log time">
        <LogForm blocks={blocks} date={today} place={place} onDone={() => (setLogOpen(false), refreshAll())} />
      </Modal>
    </Panel>
  );
}

function SlotCardNow({ slot, block, task, nowMin, onStart, busy }: {
  slot: Slot; block?: Block; task?: Task; nowMin: number; onStart: () => void; busy: boolean;
}) {
  const late = nowMin - slot.start_min;
  return (
    <div className="relative isolate px-1 pt-2 pb-1">
      <Scrap color={tint(block?.color ?? "#888", 0.55)} className="-inset-x-1 -top-1 bottom-12 -z-10 -rotate-1" />
      <div className="relative bg-surface/85 p-4 shadow-sm" style={{ rotate: "0.5deg" }}>
        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          <BlockDot block={block} /> <span className="uppercase">{block?.name}</span> · {fmtMin(slot.start_min)}–{fmtMin(slot.end_min)}
          <span className="ml-auto"><EnergyTag energy={slot.energy} /></span>
        </div>
        <p className="font-display mt-2 text-[2rem] leading-[1.05]">
          {slot.label || (task ? task.title : `Time on ${block?.name.toLowerCase()}`)}
        </p>
        <Scribble className="mt-1 h-3 w-32" color={block?.color} />
        {slot.label && task && <p className="mt-1 text-sm text-muted">{task.title}</p>}
        {late >= 5 && <p className="font-hand mt-2 text-lg leading-tight text-muted">it&apos;s {fmtMin(nowMin)}, started {fmtDuration(late)} ago. still {fmtDuration(slot.end_min - nowMin)} to go →</p>}
      </div>
      <button className="btn btn-primary mt-4 w-full py-3 text-base" disabled={busy} onClick={onStart}>▶ Start</button>
    </div>
  );
}

function RunningCard({ session, block, task, slot, nowMin, onStop, busy }: {
  session: Session; block?: Block; task?: Task; slot?: Slot; nowMin: number; onStop: () => void; busy: boolean;
}) {
  const mins = sessionMinutes(session);
  const secs = Math.floor((mins * 60) % 60);
  const over = slot ? nowMin - slot.end_min : 0;
  return (
    <div className="relative isolate px-1 pt-2 pb-1">
      <Scrap color={tint(block?.color ?? "#888", 0.6)} className="-inset-x-1 -top-1 bottom-12 -z-10 rotate-1" />
      {session.source === "fried" && <Stamp text="· FRIED MODE · SHALLOW ONLY " className="absolute -top-6 -right-3 z-10 size-20 rotate-12" />}
      <div className="relative bg-surface/85 p-4 shadow-sm" style={{ rotate: "-0.5deg" }}>
        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          <BlockDot block={block} /> <span className="uppercase">{block?.name}</span>
          {!slot && <span className="chip">off-plan</span>}
        </div>
        <p className="font-display mt-2 text-[1.7rem] leading-[1.05]">{task?.title ?? slot?.label ?? `Time on ${block?.name.toLowerCase()}`}</p>
        <p className="font-display mt-3 text-7xl leading-none tabular-nums">
          {Math.floor(mins / 60)}:{String(Math.floor(mins % 60)).padStart(2, "0")}
          <span className="font-mono text-2xl text-muted">:{String(secs).padStart(2, "0")}</span>
        </p>
        {over > 0 && (
          <p className="font-hand mt-2 flex items-center gap-1 text-lg leading-tight text-danger">
            running over by {fmtDuration(over)}. the rest of the day shifts when you stop <Arrow className="h-5 w-10 shrink-0" color="var(--danger)" />
          </p>
        )}
      </div>
      <button className="btn mt-4 w-full bg-fg py-3 text-base text-surface hover:bg-fg" style={{ boxShadow: "3px 3px 0 var(--yellow)" }} disabled={busy} onClick={onStop}>■ Stop</button>
    </div>
  );
}

function QuickCapture({ blocks, defaultBlock }: { blocks: Block[]; defaultBlock?: string }) {
  const [title, setTitle] = useState("");
  const [blockId, setBlockId] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const bid = blockId || defaultBlock || blocks[0]?.id;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await api("/api/tasks", "POST", { title: title.trim(), block_id: bid, energy: "shallow" });
    setTitle("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    refreshAll();
  }
  return (
    <form onSubmit={save} className="space-y-1">
      <div className="flex gap-2">
        <input className="input" placeholder="Quick capture a mindless to-do…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="input w-auto" value={bid} onChange={(e) => setBlockId(e.target.value)} aria-label="Block">
          {blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <p className="font-hand text-base text-muted">{saved ? "pinned to the shallow list ✓" : "mindless to-dos go to the shallow list, so it's always full"}</p>
    </form>
  );
}

function FloorStatus() {
  const { data } = useStreak();
  if (!data) return null;
  if (data.today_counts) return <p className="font-hand text-xl text-ok">✓ today counts for the streak!</p>;
  const needs = [data.today_needs.floor && "a job-search slot", data.today_needs.other && "one other session"].filter(Boolean);
  return <p className="font-hand text-xl leading-tight text-muted">floor day: {needs.join(" + ")} keeps the 🔥 {data.streak} streak alive</p>;
}

function SwitchForm({ blocks, onStart }: { blocks: Block[]; onStart: (blockId: string, taskId: string | null) => void }) {
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? "");
  const [taskId, setTaskId] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Off-plan time is still logged, in the block you intend it for.</p>
      <Field label="Block">
        <select className="input" value={blockId} onChange={(e) => (setBlockId(e.target.value), setTaskId(null))}>
          {blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </Field>
      <TaskSelect blockId={blockId} value={taskId} onChange={setTaskId} />
      <button className="btn btn-primary w-full" onClick={() => onStart(blockId, taskId)}>▶ Start timer</button>
    </div>
  );
}

export function LogForm({ blocks, date, place, onDone, slot }: {
  blocks: Block[]; date: string; place: string; onDone: () => void; slot?: Slot;
}) {
  const [blockId, setBlockId] = useState(slot?.block_id ?? blocks[0]?.id ?? "");
  const [taskId, setTaskId] = useState<string | null>(slot?.task_id ?? null);
  const [startAt, setStartAt] = useState(toHHMM(slot?.start_min ?? Math.max(0, minutesNow() - 60)));
  const [minutes, setMinutes] = useState(slot ? slot.end_min - slot.start_min : 60);
  const [where, setWhere] = useState(place);
  const [error, setError] = useState<unknown>(null);
  async function save() {
    try {
      const s = parseHHMM(startAt);
      await api("/api/sessions", "POST", {
        block_id: blockId, task_id: taskId, slot_id: slot?.id ?? null, place: where, source: "manual",
        started_at: wallToIso(date, s), ended_at: wallToIso(date, s + minutes),
      });
      onDone();
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="space-y-3">
      <Field label="Block">
        <select className="input" value={blockId} onChange={(e) => (setBlockId(e.target.value), setTaskId(null))}>
          {blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </Field>
      <TaskSelect blockId={blockId} value={taskId} onChange={setTaskId} />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Started"><input type="time" className="input" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></Field>
        <Field label="Minutes"><input type="number" min={5} step={5} className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
        <Field label="Where">
          <select className="input" value={where} onChange={(e) => setWhere(e.target.value)}>
            <option value="home">Home</option><option value="outside">Outside</option>
          </select>
        </Field>
      </div>
      <ErrorNote error={error} />
      <button className="btn btn-primary w-full" onClick={save}>Log {fmtDuration(minutes)}</button>
    </div>
  );
}
