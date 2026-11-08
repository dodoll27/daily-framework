"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WeekSchedule } from "@/components/schedule";
import { Panel } from "@/components/ui";
import { WeekPanel } from "@/components/week";
import { addDays, dayLabel, localDate, weekStart } from "@/lib/time";

export default function WeekPage() {
  const router = useRouter();
  const [start, setStart] = useState(() => weekStart(localDate()));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Week of {dayLabel(start, { day: "numeric", month: "long" })}</h1>
        <div className="ml-auto flex gap-1">
          <button className="btn px-2.5" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week">‹</button>
          <button className="btn" onClick={() => setStart(weekStart(localDate()))}>This week</button>
          <button className="btn px-2.5" onClick={() => setStart(addDays(start, 7))} aria-label="Next week">›</button>
        </div>
      </div>
      <WeekPanel start={start} detailed />
      <Panel title="Timeline">
        <WeekSchedule start={start} onPick={(d) => router.push(`/schedule#${d}`)} />
      </Panel>
    </div>
  );
}
