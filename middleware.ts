import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicCorsPreflightResponse } from "@/lib/api/public-cors";
import { clearStaleAuthSession, isInvalidRefreshTokenError } from "@/lib/auth/invalid-refresh-token";
import { isPlatformAdminUser } from "@/lib/auth/post-login-redirect";
import { PLATFORM_WORKSPACE_COOKIE } from "@/lib/constants/workspace-session";
import { tryWwwRedirectResponse } from "@/lib/website-builder/www-redirect-middleware";



type MembershipWithCompany =

  | {

      companies?:

        | { slug?: string | null }

        | { slug?: string | null }[]

        | null;

    }

  | null;



function companySlugFromMembership(membership: MembershipWithCompany): string | null {

  if (!membership?.companies) return null;

  if (Array.isArray(membership.companies)) {

    return membership.companies[0]?.slug ?? null;

  }

  return membership.companies.slug ?? null;

}



async function userHasCompanySlugAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  companySlug: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
      company_id,
      companies!inner ( slug )
    `
    )
    .eq("user_id", userId)
    .eq("companies.slug", companySlug)
    .maybeSingle();

  if (error) {
    console.error("[middleware] userHasCompanySlugAccess", error.message);
    return false;
  }

  return Boolean(data);
}

async function userHasActivePlatformWorkspaceSession(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  sessionId: string,
  expectedSlug: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("platform_workspace_sessions")
    .select("company_slug, platform_user_id, ended_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[middleware] userHasActivePlatformWorkspaceSession", error.message);
    }
    return false;
  }

  return (
    !data.ended_at &&
    data.platform_user_id === userId &&
    data.company_slug === expectedSlug
  );
}



function signInRedirect(request: NextRequest) {

  const signInUrl = new URL("/auth/sign-in", request.url);

  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  signInUrl.searchParams.set("next", next);

  return NextResponse.redirect(signInUrl);

}



export async function middleware(request: NextRequest) {

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/public/") && request.method === "OPTIONS") {
    return publicCorsPreflightResponse();
  }

  const wwwRedirect = await tryWwwRedirectResponse(request);
  if (wwwRedirect) return wwwRedirect;

  const isOnboarding =

    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  const isPublicWebsiteRoute =

    pathname === "/" ||

    pathname.startsWith("/preview/") ||

    pathname === "/services" ||

    pathname === "/about" ||

    pathname === "/contact" ||

    pathname === "/reviews" ||

    pathname === "/blog" ||

    pathname.startsWith("/blog/") ||

    pathname === "/sitemap.xml" ||

    pathname === "/robots.txt";



  if (

    pathname.startsWith("/_next") ||

    pathname.startsWith("/api") ||

    pathname.startsWith("/embed/") ||

    pathname === "/tracking.js" ||

    pathname === "/site.webmanifest" ||

    pathname === "/favicon.ico" ||

    pathname === "/favicon-16x16.png" ||

    pathname === "/favicon-32x32.png" ||

    pathname === "/favicon-48x48.png" ||

    pathname === "/apple-touch-icon.png" ||

    pathname === "/android-chrome-192x192.png" ||

    pathname === "/android-chrome-512x512.png" ||

    isPublicWebsiteRoute ||

    pathname === "/" ||

    pathname.startsWith("/examples") ||

    pathname.startsWith("/marketplace") ||

    pathname.startsWith("/book/") ||

    pathname.startsWith("/site/") ||

    pathname.startsWith("/portal/") ||

    pathname.startsWith("/pricing") ||

    pathname.startsWith("/features") ||

    pathname.startsWith("/industries") ||

    pathname.startsWith("/hosting") ||

    pathname.startsWith("/auth") ||

    pathname.startsWith("/terms") ||

    pathname.startsWith("/privacy") ||

    pathname.startsWith("/platform")

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
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  const sessionExpired = isInvalidRefreshTokenError(authError);
  if (sessionExpired) {
    await clearStaleAuthSession(supabase, authError);
  }

  const user = sessionExpired ? null : authUser;

  if (isOnboarding) {

    if (user) {

      const { data: membership } = await supabase

        .from("memberships")

        .select(

          `

          company_id,

          companies ( slug )

        `

        )

        .eq("user_id", user.id)

        .limit(1)

        .maybeSingle();



      const companySlug = companySlugFromMembership(

        membership as MembershipWithCompany

      );



      if (companySlug) {

        const redirectParam = request.nextUrl.searchParams.get("redirect");

        const hostingPlan = request.nextUrl.searchParams.get("hostingPlan");

        if (redirectParam === "hosting") {

          const hostingPath = `/${encodeURIComponent(companySlug)}/dashboard/billing?tab=hosting`;

          const target = hostingPlan

            ? `${hostingPath}&plan=${encodeURIComponent(hostingPlan)}`

            : hostingPath;

          return NextResponse.redirect(new URL(target, request.url));

        }

        return NextResponse.redirect(

          new URL(`/${encodeURIComponent(companySlug)}/dashboard`, request.url)

        );

      }

      if (await isPlatformAdminUser(supabase, user.id)) {

        return NextResponse.redirect(new URL("/admin", request.url));

      }

    }

    return response;

  }



  if (!user) {

    return signInRedirect(request);

  }



  const isAdmin = user
    ? await isPlatformAdminUser(supabase, user.id)
    : false;



  if (pathname.startsWith("/admin")) {

    if (!isAdmin) {

      return NextResponse.redirect(new URL("/app", request.url));

    }

    if (pathname.startsWith("/admin/workspace/")) {
      const workspaceMatch = pathname.match(/^\/admin\/workspace\/([^/]+)(\/.*)?$/);
      if (!workspaceMatch) {
        return NextResponse.redirect(new URL("/admin/businesses", request.url));
      }

      const workspaceSlug = decodeURIComponent(workspaceMatch[1]);
      let suffix = workspaceMatch[2] ?? "/dashboard";

      if (suffix === "" || suffix === "/") {
        suffix = "/dashboard";
      }

      if (!suffix.startsWith("/dashboard")) {
        return NextResponse.redirect(
          new URL(
            `/admin/workspace/${encodeURIComponent(workspaceSlug)}/dashboard${suffix.startsWith("/") ? suffix : `/${suffix}`}`,
            request.url
          )
        );
      }

      const sessionId = request.cookies.get(PLATFORM_WORKSPACE_COOKIE)?.value?.trim();
      if (!sessionId) {
        return NextResponse.redirect(new URL("/admin/businesses", request.url));
      }

      const hasSession = await userHasActivePlatformWorkspaceSession(
        supabase,
        user.id,
        sessionId,
        workspaceSlug
      );

      if (!hasSession) {
        return NextResponse.redirect(new URL("/admin/businesses", request.url));
      }

      const rewriteUrl = new URL(
        `/${encodeURIComponent(workspaceSlug)}${suffix}${request.nextUrl.search}`,
        request.url
      );

      return NextResponse.rewrite(rewriteUrl);
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



  const companySlug = companySlugFromMembership(

    membership as MembershipWithCompany

  );



  if (!companySlug) {
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.redirect(new URL("/onboarding", request.url));

  }



  if (companySlug && pathname.startsWith("/dashboard")) {

    const suffix = pathname.slice("/dashboard".length) || "";

    const target = new URL(

      `/${encodeURIComponent(companySlug)}/dashboard${suffix}`,

      request.url

    );

    if (target.pathname !== pathname) {

      return NextResponse.redirect(target);

    }

  }



  if (/^\/[^/]+\/project(\/|$)/.test(pathname)) {
    const pathCompanySlug = decodeURIComponent(pathname.split("/")[1]);
    const suffix = pathname.replace(/^\/[^/]+\/project/, "");
    return NextResponse.redirect(
      new URL(
        `/${encodeURIComponent(pathCompanySlug)}/dashboard/project${suffix}`,
        request.url
      )
    );
  }



  const companyRouteMatch = pathname.match(/^\/([^/]+)\/(dashboard|project)/);

  if (companyRouteMatch) {
    const pathCompanySlug = decodeURIComponent(companyRouteMatch[1]);
    const hasAccess = await userHasCompanySlugAccess(
      supabase,
      user.id,
      pathCompanySlug
    );

    if (!hasAccess) {
      return NextResponse.redirect(
        new URL(`/${encodeURIComponent(companySlug)}/dashboard`, request.url)
      );
    }
  }



  return response;

}



export const config = {

  matcher: [

    "/((?!_next/static|_next/image|favicon.ico|site\\.webmanifest|embed/|tracking\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",

  ],

};


