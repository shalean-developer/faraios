import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { isDocumentNavigationRequest, isMainHost } from "@/lib/hosting/main-host";
import { resolveWwwRedirectForHost } from "@/lib/website-builder/www-redirect";

export async function tryWwwRedirectResponse(
  request: NextRequest
): Promise<NextResponse | null> {
  try {
    const host = request.headers.get("host") ?? "";
    if (!host || isMainHost(host)) return null;

    // Redirecting RSC/prefetch fetches breaks Next.js client navigation ("Failed to fetch").
    if (!isDocumentNavigationRequest(request)) return null;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return null;

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const redirect = await resolveWwwRedirectForHost(host, supabase);
    if (!redirect) return null;

    const target = new URL(request.url);
    target.host = redirect.targetHost;
    target.protocol = request.nextUrl.protocol === "http:" ? "http:" : "https:";

    return NextResponse.redirect(target, 301);
  } catch (error) {
    console.error("[middleware] www redirect", error);
    return null;
  }
}
