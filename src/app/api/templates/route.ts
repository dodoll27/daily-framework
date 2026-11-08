import { body, must, route } from "@/lib/http";
import { cleanTemplate } from "@/lib/server-shared";

export const GET = route(async ({ supabase }) =>
  must(await supabase.from("day_templates").select("*").order("sort_order")),
);

export const POST = route(async ({ supabase, req }) => {
  const b = await body(req);
  return must(await supabase.from("day_templates").insert(cleanTemplate(b)).select().single());
});
