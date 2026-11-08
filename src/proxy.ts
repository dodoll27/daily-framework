import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";

const PUBLIC = ["/login", "/auth", "/setup", "/manifest.webmanifest", "/icon", "/apple-icon"];

/** Refreshes the Supabase session cookie and sends signed-out visitors to /login. */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!supabaseConfigured) {
    if (path.startsWith("/api") || path.startsWith("/setup")) return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));
  if (!user && !isPublic && !path.startsWith("/api")) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
