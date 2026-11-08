import { body, HttpError, isDate, must, pick, requireDate, route } from "@/lib/http";
import { reflowDay, SLOT_FIELDS } from "@/lib/server-shared";
import type { Slot } from "@/lib/types";

/** GET /api/slots?from=YYYY-MM-DD&to=YYYY-MM-DD */
export const GET = route(async ({ supabase, req }) => {
  const sp = req.nextUrl.searchParams;
  const from = requireDate(sp.get("from"), "from");
  const to = sp.get("to") ?? from;
  if (!isDate(to)) throw new HttpError(400, "to must be YYYY-MM-DD");
  return must(
    await supabase.from("slots").select("*").gte("date", from).lte("date", to).order("date").order("start_min"),
  );
});

export const POST = route(async ({ supabase, req }) => {
  const b = await body(req);
  requireDate(b.date);
  const slot = must(await supabase.from("slots").insert(pick(b, SLOT_FIELDS)).select().single()) as Slot;
  if (b.reflow !== false) await reflowDay(supabase, slot);
  return slot;
});
