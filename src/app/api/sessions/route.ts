import { body, HttpError, must, pick, route } from "@/lib/http";
import { SESSION_FIELDS, stopRunning } from "@/lib/server-shared";

/**
 * GET /api/sessions?from=ISO&to=ISO   sessions that started in range
 * GET /api/sessions?running=1         the running timer (or null)
 */
export const GET = route(async ({ supabase, req }) => {
  const sp = req.nextUrl.searchParams;
  if (sp.get("running")) {
    return must(await supabase.from("sessions").select("*").is("ended_at", null).maybeSingle());
  }
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) throw new HttpError(400, "from and to (ISO timestamps) are required");
  return must(
    await supabase.from("sessions").select("*").gte("started_at", from).lt("started_at", to).order("started_at"),
  );
});

/** Start a timer (no ended_at → stops any running one first) or log time manually. */
export const POST = route(async ({ supabase, req }) => {
  const b = await body(req);
  if (!b.block_id) throw new HttpError(400, "block_id is required");
  const row = pick(b, SESSION_FIELDS);
  if (!row.ended_at) {
    const started = (row.started_at as string) ?? new Date().toISOString();
    row.started_at = started;
    await stopRunning(supabase, started);
  } else if (!row.source) {
    row.source = "manual";
  }
  return must(await supabase.from("sessions").insert(row).select().single());
});
