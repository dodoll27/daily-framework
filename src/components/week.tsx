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
      <ul className="space-y-4">
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
              <div className="mb-1.5 flex items-center gap-2 text-sm">
                <BlockDot block={b} />
                <span className="font-mono text-[12px] font-bold uppercase">{b.name}</span>
                {behind && <span className="font-hand -rotate-2 text-lg leading-none text-danger">← furthest behind!</span>}
                <span className="ml-auto font-mono text-[11px] text-muted tabular-nums">{label}</span>
              </div>
              <ProgressBar value={p.target_minutes || p.target_sessions ? p.ratio : 0} expected={p.expected_ratio} color={b.color} />
            </li>
          );
        })}
      </ul>
      <p className="font-hand mt-3 text-base text-muted">the pencil tick = where an even pace would put you</p>

      {detailed && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="cutout mb-3 bg-accent">Day types</h3>
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
            <h3 className="cutout mb-3 bg-pink text-fg">Home vs outside</h3>
            <div className="halftone flex h-3.5 overflow-hidden border border-fg/20">
              {totalHome + totalOut > 0 && (
                <>
                  <div className="bg-yellow" style={{ width: `${(totalHome / (totalHome + totalOut)) * 100}%` }} />
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
    <div className="flex items-center gap-2 text-sm">
      <span title={data.today_counts ? "Today counts" : "Today doesn't count yet"}
        className={`flex rotate-[-3deg] items-center gap-1 border-[1.5px] border-fg bg-yellow px-2 py-0.5 shadow-[2px_2px_0_var(--fg)] ${data.today_counts ? "" : "opacity-70"}`}>
        🔥 <b className="font-display text-xl leading-none tabular-nums">{data.streak}</b>
      </span>
      <span className="font-mono text-[11px] text-muted tabular-nums" title={`${fmtHours(data.total_minutes)} logged all-time`}>
        {data.xp}xp
      </span>
    </div>
  );
}
