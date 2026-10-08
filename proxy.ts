import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { hasSupabaseAuthCookie } from "@/lib/auth/redirects";

export async function proxy(request: NextRequest) {
  const protectedPath = ["/traveler", "/host", "/dmo", "/admin"].some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
  // The planner is a public preview. Its page checks the user once to show saved journeys.
  const publicPlanner = request.nextUrl.pathname.replace(/\/$/u, "") === "/traveler/plan";
  if (!hasSupabaseAuthCookie(request.cookies.getAll())) {
    if (protectedPath && !publicPlanner) {
      const login = new URL("/auth/login", request.url);
      login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }
    return NextResponse.next({ request });
  }

  const config = getSupabasePublicConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (protectedPath && !publicPlanner && !user) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = { matcher: ["/traveler/:path*", "/host/:path*", "/dmo/:path*", "/admin/:path*"] };
