import { body, must, pick, requireDate, route } from "@/lib/http";

type P = { date: string };
const DAY_FIELDS = ["template_id", "place_default", "review_done", "energy_note", "mood", "is_freeze"] as const;

/** A day with its slots. */
export const GET = route<P>(async ({ supabase }, { date }) => {
  requireDate(date);
  const [day, slots] = await Promise.all([
    supabase.from("days").select("*").eq("date", date).maybeSingle(),
    supabase.from("slots").select("*").eq("date", date).order("start_min"),
  ]);
  return { day: must(day), slots: must(slots) };
});

/** Upsert day-level fields (freeze, place, review, energy note). */
export const PUT = route<P>(async ({ supabase, req, user }, { date }) => {
  requireDate(date);
  const b = await body(req);
  return must(
    await supabase.from("days").upsert({ ...pick(b, DAY_FIELDS), date, user_id: user.id }, { onConflict: "user_id,date" })
      .select().single(),
  );
});
