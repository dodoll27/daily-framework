"use client";

import { blockMap, useBlocks, useStreak, useTemplates, useWeekStats } from "@/lib/client";
import { fmtHours } from "@/lib/time";
import { BlockDot, Panel, ProgressBar, Spinner } from "./ui";

/** Hours per block vs target, mix of day types, home vs outside. */
export function WeekPanel({ start, detailed = false }: { start: string; detailed?: boolean }) {
  const { data: stats } = useWeekStats(start);
  const { data: blocks } = useBlocks();
  const { data: templates } = useTemplates();
  if (!stats || !blocks) return <Panel title="This week"><Spinner /></Panel>;
  const bmap = blockMap(blocks);
  const totalHome = stats.place.home_minutes;
  const totalOut = stats.place.outside_minutes;

  return (
    <Panel title="This week">
      <ul className="space-y-3">
        {stats.blocks.map((p) => {
          const b = bmap.get(p.block_id)!;
          const behind = stats.furthest_behind === p.block_id;
          const label = p.target_sessions
            ? `${p.sessions} / ${p.target_sessions} sessions`
            : p.target_minutes
              ? `${fmtHours(p.minutes)} / ${fmtHours(p.target_minutes)}`
              : fmtHours(p.minutes);
          return (
            <li key={p.block_id}>
              <div className="mb-1 flex items-center gap-2 text-sm">
                <BlockDot block={b} />
                <span className="font-medium">{b.name}</span>
                {behind && <span className="chip text-danger">furthest behind</span>}
                <span className="ml-auto text-muted tabular-nums">{label}</span>
              </div>
              <ProgressBar value={p.target_minutes || p.target_sessions ? p.ratio : 0} expected={p.expected_ratio} color={b.color} />
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted">The tick marks where you&apos;d be at an even pace.</p>

      {detailed && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold text-muted uppercase">Day types</h3>
            {stats.day_types.length === 0 && <p className="text-sm text-muted">None planned yet.</p>}
            <ul className="space-y-1 text-sm">
              {stats.day_types.map((d) => (
                <li key={d.template_id ?? "none"} className="flex justify-between">
                  <span>{templates?.find((t) => t.id === d.template_id)?.name ?? "Custom"}</span>
                  <span className="text-muted">{d.count}×</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold text-muted uppercase">Home vs outside</h3>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
              {totalHome + totalOut > 0 && (
                <>
                  <div className="bg-fg/50" style={{ width: `${(totalHome / (totalHome + totalOut)) * 100}%` }} />
                  <div className="bg-accent" style={{ flex: 1 }} />
                </>
              )}
            </div>
            <div className="mt-1 flex justify-between text-sm text-muted">
              <span>Home {fmtHours(totalHome)} · {stats.place.home_sessions}</span>
              <span>Outside {fmtHours(totalOut)} · {stats.place.outside_sessions}</span>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function StreakBadge() {
  const { data } = useStreak();
  if (!data) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span title={data.today_counts ? "Today counts" : "Today doesn't count yet"} className={data.today_counts ? "" : "opacity-60"}>
        🔥 <b className="tabular-nums">{data.streak}</b>
      </span>
      <span className="text-muted tabular-nums" title={`${fmtHours(data.total_minutes)} logged all-time`}>
        {data.xp} XP
      </span>
    </div>
  );
}
