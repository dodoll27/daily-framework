import { body, HttpError, must, route } from "@/lib/http";
import { stopRunning } from "@/lib/server-shared";
import type { Block, Slot, Task } from "@/lib/types";

/**
 * "I'm fried": swap the current task for the top shallow task, no choice needed.
 * Prefers the current slot's block, then blocks in their usual order.
 * Time counts to the chosen task's block.
 */
export const POST = route(async ({ supabase, req }) => {
  const b = await body<{ slot_id?: string | null; place?: string; skip_task_id?: string | null }>(req);
  const [blocks, tasks, slot] = await Promise.all([
    supabase.from("blocks").select("*").order("sort_order"),
    supabase.from("tasks").select("*").eq("status", "open").eq("energy", "shallow").order("sort_order").order("created_at"),
    b.slot_id ? supabase.from("slots").select("*").eq("id", b.slot_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const blockList = must(blocks) as Block[];
  const shallow = (must(tasks) as Task[]).filter((t) => t.id !== b.skip_task_id);
  const current = must(slot) as Slot | null;

  const order = [
    ...(current ? [current.block_id] : []),
    ...blockList.map((x) => x.id).filter((id) => id !== current?.block_id),
  ];
  const task = order.map((id) => shallow.find((t) => t.block_id === id)).find(Boolean);
  if (!task) throw new HttpError(404, "Your shallow list is empty. Capture some mindless to-dos first.");

  const now = new Date().toISOString();
  await stopRunning(supabase, now);
  const session = must(
    await supabase.from("sessions").insert({
      block_id: task.block_id,
      task_id: task.id,
      slot_id: current && current.block_id === task.block_id ? current.id : null,
      started_at: now,
      place: b.place === "outside" ? "outside" : "home",
      source: "fried",
    }).select().single(),
  );
  return { task, session };
});
