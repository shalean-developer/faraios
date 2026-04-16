import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicWebsiteRoute =
    pathname === "/" ||
    pathname.startsWith("/preview/") ||
    pathname === "/services" ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt";

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    isPublicWebsiteRoute ||
    pathname === "/" ||
    pathname.startsWith("/examples") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy")
  ) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const response = NextResponse.next({ request });
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Always route super admins to /admin before membership checks.
  if (admin && !pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!admin) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return response;
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select(
      `
      company_id,
      role,
      companies ( slug )
    `
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  type MembershipWithCompany =
    | {
        companies?:
          | { slug?: string | null }
          | { slug?: string | null }[]
          | null;
      }
    | null;

  const typedMembership = membership as MembershipWithCompany;
  const companySlug = Array.isArray(typedMembership?.companies)
    ? typedMembership.companies[0]?.slug ?? null
    : typedMembership?.companies?.slug ?? null;

  if (!companySlug && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (companySlug && pathname === "/onboarding") {
    return NextResponse.redirect(
      new URL(`/${encodeURIComponent(companySlug)}/dashboard`, request.url)
    );
  }

  const isCompanyRoute = /^\/[^/]+\/(dashboard|project)/.test(pathname);
  if (isCompanyRoute) {
    const pathCompany = pathname.split("/")[1];
    if (pathCompany !== companySlug) {
      const fallback = companySlug
        ? `/${encodeURIComponent(companySlug)}/dashboard`
        : "/onboarding";
      return NextResponse.redirect(
        new URL(fallback, request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
