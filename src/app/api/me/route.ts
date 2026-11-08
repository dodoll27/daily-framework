import { must, route } from "@/lib/http";

/** Current user; seeds default blocks/templates if this account has none yet. */
export const GET = route(async ({ supabase, user }) => {
  const { count } = await supabase.from("blocks").select("id", { count: "exact", head: true });
  if (!count) must(await supabase.rpc("ensure_defaults"));
  return { id: user.id, email: user.email };
});
