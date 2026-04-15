import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/public-env";

function safeRedirectPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/get-started")) return true;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))
    return true;
  if (pathname.startsWith("/admin")) return true;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2 && segments[1] === "dashboard") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();

  let supabaseResponse = NextResponse.next({ request });

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/auth")) {
    if (user) {
      const nextRaw = request.nextUrl.searchParams.get("next");
      const dest = safeRedirectPath(nextRaw) ?? "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return supabaseResponse;
  }

  if (isProtectedPath(pathname) && !user) {
    const login = new URL("/auth", request.url);
    login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
