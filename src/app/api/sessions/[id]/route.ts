import { body, must, pick, route } from "@/lib/http";
import { SESSION_FIELDS } from "@/lib/server-shared";

type P = { id: string };

/** Stop a timer ({ ended_at }) or correct a session. */
export const PATCH = route<P>(async ({ supabase, req }, { id }) => {
  const b = await body(req);
  const row = pick(b, SESSION_FIELDS);
  if (b.stop) row.ended_at = new Date().toISOString();
  return must(await supabase.from("sessions").update(row).eq("id", id).select().single());
});

export const DELETE = route<P>(async ({ supabase }, { id }) => {
  must(await supabase.from("sessions").delete().eq("id", id));
  return { ok: true };
});
