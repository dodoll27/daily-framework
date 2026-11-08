import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "./supabase/env";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Ctx = { supabase: SupabaseClient; user: User; req: NextRequest };
type RouteCtx<P> = { params: Promise<P> };

/** Wraps a REST handler: authenticates the user, maps errors to JSON responses. */
export function route<P = Record<string, string>>(
  fn: (ctx: Ctx, params: P) => Promise<unknown>,
) {
  return async (req: NextRequest, routeCtx: RouteCtx<P>) => {
    const pending: { name: string; value: string; options: CookieOptions }[] = [];
    const withCookies = (res: NextResponse) => {
      pending.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      return res;
    };
    try {
      if (!supabaseConfigured) throw new HttpError(503, "Supabase is not configured (see /setup)");
      const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (toSet) => void pending.push(...toSet),
        },
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new HttpError(401, "Not signed in");
      const params = routeCtx?.params ? await routeCtx.params : ({} as P);
      const result = await fn({ supabase, user, req }, params);
      if (result instanceof NextResponse) return withCookies(result);
      return withCookies(NextResponse.json(result ?? { ok: true }));
    } catch (e) {
      if (e instanceof HttpError) return withCookies(NextResponse.json({ error: e.message }, { status: e.status }));
      console.error(e);
      const message = e instanceof Error ? e.message : "Server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

/** Throws on a Supabase error, returns data otherwise. */
export function must<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    const status = res.error.code === "PGRST116" ? 404 : 400;
    throw new HttpError(status, res.error.message);
  }
  return res.data;
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

/** Keep only allowed keys from a request body. */
export function pick<T extends Record<string, unknown>>(obj: T, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

export function isDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function requireDate(s: unknown, name = "date"): string {
  if (!isDate(s)) throw new HttpError(400, `${name} must be YYYY-MM-DD`);
  return s;
}
