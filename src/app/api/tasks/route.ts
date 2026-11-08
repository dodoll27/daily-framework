import { body, HttpError, must, pick, route } from "@/lib/http";
import { TASK_FIELDS } from "@/lib/server-shared";

export const GET = route(async ({ supabase, req }) => {
  const sp = req.nextUrl.searchParams;
  let q = supabase.from("tasks").select("*").order("sort_order").order("created_at");
  q = q.eq("status", sp.get("status") ?? "open");
  if (sp.get("block_id")) q = q.eq("block_id", sp.get("block_id")!);
  if (sp.get("energy")) q = q.eq("energy", sp.get("energy")!);
  return must(await q);
});

export const POST = route(async ({ supabase, req }) => {
  const b = await body(req);
  if (!b.title || !b.block_id) throw new HttpError(400, "title and block_id are required");
  const row = pick(b, TASK_FIELDS);
  if (row.sort_order === undefined) {
    // new tasks go to the end of their list
    const last = must(
      await supabase.from("tasks").select("sort_order").eq("block_id", b.block_id as string)
        .order("sort_order", { ascending: false }).limit(1),
    );
    row.sort_order = (last?.[0]?.sort_order ?? -1) + 1;
  }
  return must(await supabase.from("tasks").insert(row).select().single());
});
