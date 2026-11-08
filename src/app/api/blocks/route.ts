import { body, must, pick, route } from "@/lib/http";
import { BLOCK_FIELDS } from "@/lib/server-shared";

export const GET = route(async ({ supabase }) =>
  must(await supabase.from("blocks").select("*").order("sort_order")),
);

export const POST = route(async ({ supabase, req }) => {
  const b = await body(req);
  return must(await supabase.from("blocks").insert(pick(b, BLOCK_FIELDS)).select().single());
});
