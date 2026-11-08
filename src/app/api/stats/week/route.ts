import { HttpError, must, requireDate, route } from "@/lib/http";
import { blockProgress, furthestBehind } from "@/lib/stats";
import { dateInZone, sessionMinutes } from "@/lib/time";
import type { Block, Day, Session, WeekStats } from "@/lib/types";

function shift(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/stats/week?start=YYYY-MM-DD (Monday)&tz=Europe/Paris
 * Hours per block vs target, furthest-behind block, day-type mix, home vs outside.
 */
export const GET = route(async ({ supabase, req }) => {
  const sp = req.nextUrl.searchParams;
  const start = requireDate(sp.get("start"), "start");
  const tz = sp.get("tz") || "UTC";
  try {
    dateInZone(Date.now(), tz);
  } catch {
    throw new HttpError(400, "invalid tz");
  }
  const end = shift(start, 6);

  const [blocksR, sessionsR, daysR] = await Promise.all([
    supabase.from("blocks").select("*").order("sort_order"),
    // widen by a day on each side, then bucket by local date
    supabase.from("sessions").select("*").gte("started_at", `${shift(start, -1)}T00:00:00Z`).lt("started_at", `${shift(end, 2)}T00:00:00Z`),
    supabase.from("days").select("*").gte("date", start).lte("date", end),
  ]);
  const blocks = must(blocksR) as Block[];
  const days = must(daysR) as Day[];
  const sessions = (must(sessionsR) as Session[]).filter((s) => {
    const d = dateInZone(s.started_at, tz);
    return d >= start && d <= end;
  });

  const today = dateInZone(Date.now(), tz);
  const elapsedDays = today < start ? 0 : today > end ? 7 : (Date.parse(today) - Date.parse(start)) / 86400000 + 1;
  const progress = blockProgress(blocks, sessions, elapsedDays / 7);

  const types = new Map<string | null, number>();
  for (const d of days) if (d.template_id) types.set(d.template_id, (types.get(d.template_id) ?? 0) + 1);

  const place = { home_minutes: 0, outside_minutes: 0, home_sessions: 0, outside_sessions: 0 };
  const perDay = new Map<string, { minutes: number; by_block: Record<string, number> }>();
  for (let i = 0; i < 7; i++) perDay.set(shift(start, i), { minutes: 0, by_block: {} });
  for (const s of sessions) {
    const m = sessionMinutes(s);
    if (s.place === "outside") {
      place.outside_minutes += m;
      place.outside_sessions++;
    } else {
      place.home_minutes += m;
      place.home_sessions++;
    }
    const pd = perDay.get(dateInZone(s.started_at, tz));
    if (pd) {
      pd.minutes += m;
      pd.by_block[s.block_id] = (pd.by_block[s.block_id] ?? 0) + m;
    }
  }

  const result: WeekStats = {
    from: start,
    to: end,
    blocks: progress,
    furthest_behind: furthestBehind(blocks, progress),
    day_types: [...types].map(([template_id, count]) => ({ template_id, count })),
    place: {
      home_minutes: Math.round(place.home_minutes),
      outside_minutes: Math.round(place.outside_minutes),
      home_sessions: place.home_sessions,
      outside_sessions: place.outside_sessions,
    },
    per_day: [...perDay].map(([date, v]) => ({ date, minutes: Math.round(v.minutes), by_block: v.by_block })),
  };
  return result;
});
