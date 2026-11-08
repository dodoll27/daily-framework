import { HttpError, must, route } from "@/lib/http";
import { dateInZone, sessionMinutes } from "@/lib/time";
import type { Block, Day, Session, Slot, StreakStats } from "@/lib/types";

const FLOOR_MIN = 15; // a job-search slot honoured ≈ at least 15 min logged
const OTHER_MIN = 10; // "plus any other session"
const XP_PER_HOUR = 10;

function prev(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/stats/streak?tz=Europe/Paris
 * A day counts if the floor block (Job search) got a slot honoured / ≥15 min,
 * plus any other session. Frozen days are skipped without breaking the streak.
 * Today never breaks the streak; it only extends it once it counts.
 */
export const GET = route(async ({ supabase, req }) => {
  const tz = req.nextUrl.searchParams.get("tz") || "UTC";
  try {
    dateInZone(Date.now(), tz);
  } catch {
    throw new HttpError(400, "invalid tz");
  }
  const since = new Date(Date.now() - 400 * 86400000).toISOString();
  const [blocksR, sessionsR, daysR, slotsR, totalR] = await Promise.all([
    supabase.from("blocks").select("id,is_floor"),
    supabase.from("sessions").select("block_id,started_at,ended_at").gte("started_at", since),
    supabase.from("days").select("date,is_freeze").eq("is_freeze", true),
    supabase.from("slots").select("date,block_id,status").in("status", ["honoured", "adjusted"]),
    supabase.from("sessions").select("started_at,ended_at"),
  ]);
  const floorIds = new Set((must(blocksR) as Pick<Block, "id" | "is_floor">[]).filter((b) => b.is_floor).map((b) => b.id));
  const freezes = new Set((must(daysR) as Pick<Day, "date">[]).map((d) => d.date));

  const byDay = new Map<string, { floor: number; other: number; floorSlot: boolean }>();
  const get = (d: string) => byDay.get(d) ?? byDay.set(d, { floor: 0, other: 0, floorSlot: false }).get(d)!;
  for (const s of must(sessionsR) as Session[]) {
    const m = sessionMinutes(s);
    const e = get(dateInZone(s.started_at, tz));
    if (floorIds.has(s.block_id)) e.floor += m;
    else if (m >= OTHER_MIN) e.other++;
  }
  for (const s of must(slotsR) as Pick<Slot, "date" | "block_id">[]) {
    if (floorIds.has(s.block_id)) get(s.date).floorSlot = true;
  }
  const counts = (d: string) => {
    const e = byDay.get(d);
    return !!e && (e.floor >= FLOOR_MIN || e.floorSlot) && e.other > 0;
  };

  const today = dateInZone(Date.now(), tz);
  const todayCounts = counts(today);
  let streak = todayCounts ? 1 : 0;
  let d = prev(today);
  for (let i = 0; i < 400; i++, d = prev(d)) {
    if (counts(d)) streak++;
    else if (!freezes.has(d)) break;
  }

  const total = (must(totalR) as Session[]).reduce((a, s) => a + sessionMinutes(s), 0);
  const t = byDay.get(today);
  const result: StreakStats = {
    streak,
    today_counts: todayCounts,
    today_needs: { floor: !t || (t.floor < FLOOR_MIN && !t.floorSlot), other: !t || t.other === 0 },
    xp: Math.floor((total / 60) * XP_PER_HOUR),
    total_minutes: Math.round(total),
  };
  return result;
});
