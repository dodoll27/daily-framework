import { body, must, pick, route } from "@/lib/http";
import type { Slot } from "@/lib/types";
import { reflowDay, SLOT_FIELDS } from "@/lib/server-shared";

type P = { id: string };

/** PATCH a slot. Moving/resizing pushes the rest of the day forward (pass reflow:false to skip). */
export const PATCH = route<P>(async ({ supabase, req }, { id }) => {
  const b = await body(req);
  const slot = must(await supabase.from("slots").update(pick(b, SLOT_FIELDS)).eq("id", id).select().single()) as Slot;
  const shifted = b.reflow === false || !("end_min" in b || "start_min" in b) ? [] : await reflowDay(supabase, slot);
  return { slot, shifted };
});

export const DELETE = route<P>(async ({ supabase }, { id }) => {
  must(await supabase.from("slots").delete().eq("id", id));
  return { ok: true };
});
