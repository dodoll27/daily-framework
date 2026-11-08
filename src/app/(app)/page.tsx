"use client";

import { NowPanel } from "@/components/now";
import { DaySchedule } from "@/components/schedule";
import { Panel } from "@/components/ui";
import { WeekPanel } from "@/components/week";
import { useNow } from "@/lib/client";
import { dayLabel, localDate, weekStart } from "@/lib/time";

/** Wide screen: Schedule, Now and Week side by side. Mobile: Now is home. */
export default function Home() {
  const now = useNow(60_000);
  const today = localDate(now);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <Panel title={dayLabel(today)}>
          <DaySchedule date={today} compact />
        </Panel>
      </div>
      <div className="lg:sticky lg:top-18 lg:self-start">
        <NowPanel />
      </div>
      <div className="hidden lg:block">
        <WeekPanel start={weekStart(today)} />
      </div>
    </div>
  );
}
