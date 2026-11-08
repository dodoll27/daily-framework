"use client";

import { useState } from "react";
import { DaySchedule, WeekSchedule } from "@/components/schedule";
import { Panel } from "@/components/ui";
import { addDays, dayLabel, localDate, weekStart } from "@/lib/time";

export default function SchedulePage() {
  const [view, setView] = useState<"day" | "week">("day");
  // Page content only renders in the browser (see Shell), so reading the URL here is safe.
  const [date, setDate] = useState(() => {
    const h = window.location.hash.slice(1);
    return /^\d{4}-\d{2}-\d{2}$/.test(h) ? h : localDate();
  });
  const step = view === "day" ? 1 : 7;
  const ws = weekStart(date);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 font-mono text-[13px]">
          {(["day", "week"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-2 py-1 ${view === v ? "highlight text-fg" : "text-muted hover:text-fg"}`}>{v}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn px-2.5" onClick={() => setDate(addDays(date, -step))} aria-label="Previous">‹</button>
          <button className="btn" onClick={() => setDate(localDate())}>Today</button>
          <button className="btn px-2.5" onClick={() => setDate(addDays(date, step))} aria-label="Next">›</button>
        </div>
      </div>
      <Panel title={view === "day" ? dayLabel(date) : `Week of ${dayLabel(ws, { day: "numeric", month: "short" })}`}>
        {view === "day" ? (
          <>
            <p className="font-hand mb-4 text-lg leading-tight text-muted">drag to move, drag the bottom edge to resize, tap to edit. Later slots shift instead of overlapping.</p>
            <DaySchedule date={date} />
          </>
        ) : (
          <WeekSchedule start={ws} onPick={(d) => (setDate(d), setView("day"))} />
        )}
      </Panel>
    </div>
  );
}
