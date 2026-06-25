import { NextResponse } from "next/server";

import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  getSearchConsoleOAuthCredentials,
  getSearchConsoleOAuthRedirectUri,
} from "@/lib/services/search-console-config";
import { createClient } from "@/lib/supabase/server";

type OAuthState = { companyId?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  if (oauthError) {
    return NextResponse.redirect(`${appUrl}/app?gsc=error`);
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/app?gsc=missing`);
  }

  let state: OAuthState;
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8")) as OAuthState;
  } catch {
    return NextResponse.redirect(`${appUrl}/app?gsc=invalid_state`);
  }

  const companyId = state.companyId?.trim();
  if (!companyId) {
    return NextResponse.redirect(`${appUrl}/app?gsc=invalid_state`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/auth/sign-in`);
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("companies ( slug )")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(`${appUrl}/app?gsc=denied`);
  }

  const creds = await getSearchConsoleOAuthCredentials();
  const redirectUri = getSearchConsoleOAuthRedirectUri();

  if (!creds || !redirectUri) {
    return NextResponse.redirect(`${appUrl}/app?gsc=not_configured`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    refresh_token?: string;
    error?: string;
  };

  if (!tokenRes.ok || !tokenJson.refresh_token) {
    return NextResponse.redirect(`${appUrl}/app?gsc=token_error`);
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return NextResponse.redirect(`${appUrl}/app?gsc=server_error`);
  }

  const siteUrl = appUrl;

  await admin.client.from("google_search_console_connections").upsert(
    {
      company_id: companyId,
      site_url: siteUrl,
      property_url: siteUrl,
      refresh_token: tokenJson.refresh_token,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  type CompanyRow = { slug?: string | null } | { slug?: string | null }[] | null;
  const companies = membership.companies as CompanyRow;
  const slug = Array.isArray(companies) ? companies[0]?.slug : companies?.slug;

  if (slug) {
    return NextResponse.redirect(
      `${appUrl}/${encodeURIComponent(slug)}/dashboard/seo?gsc=connected`
    );
  }

  return NextResponse.redirect(`${appUrl}/app/workspaces?gsc=connected`);
}
