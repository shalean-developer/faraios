import { NextResponse } from "next/server";

import { isSearchConsoleOAuthConfigured, searchConsoleConnectUrl } from "@/lib/services/search-console";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId")?.trim();

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: "Access denied." }, { status: 403 });
  }

  const connectUrl = await searchConsoleConnectUrl(companyId);
  if (!connectUrl) {
    const configured = await isSearchConsoleOAuthConfigured();
    return NextResponse.json(
      {
        ok: false,
        error: configured
          ? "Could not start Google Search Console OAuth. Check NEXT_PUBLIC_APP_URL."
          : "Google Search Console OAuth is not configured. Add credentials in Admin → Settings → Integrations.",
      },
      { status: 503 }
    );
  }

  return NextResponse.redirect(connectUrl);
}
