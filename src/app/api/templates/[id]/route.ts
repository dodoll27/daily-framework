import { body, must, route } from "@/lib/http";
import { cleanTemplate } from "@/lib/server-shared";

type P = { id: string };

export const PATCH = route<P>(async ({ supabase, req }, { id }) => {
  const b = await body(req);
  return must(await supabase.from("day_templates").update(cleanTemplate(b)).eq("id", id).select().single());
});

export const DELETE = route<P>(async ({ supabase }, { id }) => {
  must(await supabase.from("day_templates").delete().eq("id", id));
  return { ok: true };
});
