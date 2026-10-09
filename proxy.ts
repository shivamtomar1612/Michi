import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { hasSupabaseAuthCookie } from "@/lib/auth/redirects";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);
const protectedRoots = ["/traveler", "/host", "/dmo", "/admin"];

function copyCookies(source: NextResponse, target: NextResponse) {
  for (const { name, value, ...options } of source.cookies.getAll()) {
    target.cookies.set(name, value, options);
  }
}

export async function proxy(request: NextRequest) {
  const intlResponse = handleI18nRouting(request);
  const pathname = request.nextUrl.pathname;
  const [firstSegment, ...rest] = pathname.split("/").filter(Boolean);
  if (!routing.locales.includes(firstSegment as (typeof routing.locales)[number])) return intlResponse;

  const logicalPath = `/${rest.join("/")}`;
  const protectedPath = protectedRoots.some((path) => logicalPath === path || logicalPath.startsWith(`${path}/`));
  const publicPlanner = logicalPath.replace(/\/$/u, "") === "/traveler/plan";
  if (!protectedPath || publicPlanner) return intlResponse;

  const loginUrl = () => {
    const url = new URL(`/${firstSegment}/auth/login`, request.url);
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return url;
  };

  if (!hasSupabaseAuthCookie(request.cookies.getAll())) {
    const redirect = NextResponse.redirect(loginUrl());
    copyCookies(intlResponse, redirect);
    return redirect;
  }

  const config = getSupabasePublicConfig();
  if (!config) return intlResponse;

  let authResponse = NextResponse.next({ request });
  const supabase = createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        authResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => authResponse.cookies.set(name, value, options));
        for (const [name, value] of Object.entries(headers ?? {})) authResponse.headers.set(name, value);
      },
    },
  });

  const { data: claims, error } = await supabase.auth.getClaims();
  if (error || !claims?.claims?.sub) {
    const redirect = NextResponse.redirect(loginUrl());
    copyCookies(intlResponse, redirect);
    copyCookies(authResponse, redirect);
    return redirect;
  }

  copyCookies(authResponse, intlResponse);
  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|auth/callback|.*\\..*).*)"],
};
