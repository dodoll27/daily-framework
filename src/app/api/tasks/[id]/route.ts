import { body, must, pick, route } from "@/lib/http";
import { TASK_FIELDS } from "@/lib/server-shared";

type P = { id: string };

export const PATCH = route<P>(async ({ supabase, req }, { id }) => {
  const b = await body(req);
  return must(await supabase.from("tasks").update(pick(b, TASK_FIELDS)).eq("id", id).select().single());
});

export const DELETE = route<P>(async ({ supabase }, { id }) => {
  must(await supabase.from("tasks").delete().eq("id", id));
  return { ok: true };
});
