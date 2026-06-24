import { NextResponse } from "next/server";

import { searchConsoleConnectUrl } from "@/lib/services/search-console";
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

  const connectUrl = searchConsoleConnectUrl(companyId);
  if (!connectUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Google Search Console OAuth is not configured. Set GOOGLE_SEARCH_CONSOLE_CLIENT_ID and GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

  return NextResponse.redirect(connectUrl);
}
