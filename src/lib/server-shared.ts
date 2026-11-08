import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError, must, pick } from "./http";
import { reflow } from "./schedule";
import type { Slot, TemplateSlot } from "./types";

export const BLOCK_FIELDS = [
  "name", "color", "weekly_target_minutes", "target_sessions", "is_floor", "deep_only", "prioritize", "sort_order",
] as const;
export const TASK_FIELDS = ["block_id", "title", "energy", "status", "sort_order"] as const;
export const SLOT_FIELDS = ["date", "start_min", "end_min", "block_id", "task_id", "label", "energy", "status"] as const;
export const SESSION_FIELDS = ["slot_id", "block_id", "task_id", "started_at", "ended_at", "place", "source"] as const;
const TEMPLATE_FIELDS = ["name", "description", "place_default", "slots", "sort_order"] as const;

export function cleanTemplate(b: Record<string, unknown>) {
  const out = pick(b, TEMPLATE_FIELDS);
  if ("slots" in out) {
    if (!Array.isArray(out.slots)) throw new HttpError(400, "slots must be an array");
    out.slots = (out.slots as TemplateSlot[])
      .map((s) => ({
        start: Number(s.start),
        end: Number(s.end),
        block_id: String(s.block_id),
        energy: s.energy === "shallow" ? "shallow" : "deep",
      }))
      .filter((s) => s.end > s.start)
      .sort((a, b) => a.start - b.start);
  }
  return out;
}

/** Push later slots of the same day forward so nothing overlaps the changed slot. */
export async function reflowDay(supabase: SupabaseClient, slot: Slot) {
  const day = must(await supabase.from("slots").select("id,start_min,end_min").eq("date", slot.date)) as Slot[];
  const changed = reflow(day, slot.id);
  await Promise.all(
    changed.map((c) => supabase.from("slots").update({ start_min: c.start_min, end_min: c.end_min }).eq("id", c.id)),
  );
  return changed;
}

/** Stop whatever timer is running. */
export async function stopRunning(supabase: SupabaseClient, at = new Date().toISOString()) {
  return must(await supabase.from("sessions").update({ ended_at: at }).is("ended_at", null).select());
}
