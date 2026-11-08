import { body, HttpError, must, requireDate, route } from "@/lib/http";
import type { Energy, Place } from "@/lib/types";

type P = { date: string };
type PlanSlot = { start_min: number; end_min: number; block_id: string; task_id?: string | null; label?: string | null; energy?: Energy };
type PlanBody = { template_id?: string | null; place_default?: Place; is_freeze?: boolean; slots: PlanSlot[] };

/**
 * Save the plan for a day: day type + its slots.
 * Replaces slots that are still "planned"; slots already reviewed are kept.
 */
export const POST = route<P>(async ({ supabase, req, user }, { date }) => {
  requireDate(date);
  const b = await body<PlanBody>(req);
  if (!Array.isArray(b.slots)) throw new HttpError(400, "slots must be an array");

  const day = must(
    await supabase.from("days").upsert(
      {
        user_id: user.id,
        date,
        template_id: b.template_id ?? null,
        place_default: b.place_default ?? "home",
        is_freeze: !!b.is_freeze,
      },
      { onConflict: "user_id,date" },
    ).select().single(),
  );

  must(await supabase.from("slots").delete().eq("date", date).eq("status", "planned"));

  const rows = b.slots
    .filter((s) => s.end_min > s.start_min && s.block_id)
    .map((s) => ({
      date,
      start_min: Math.max(0, Math.round(s.start_min)),
      end_min: Math.min(1440, Math.round(s.end_min)),
      block_id: s.block_id,
      task_id: s.task_id || null,
      label: s.label || null,
      energy: s.energy === "shallow" ? "shallow" : "deep",
    }));
  const slots = rows.length ? must(await supabase.from("slots").insert(rows).select()) : [];
  return { day, slots };
});
