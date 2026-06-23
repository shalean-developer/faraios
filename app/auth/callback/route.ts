import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/safe-next-path";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/public-env";

function signInErrorRedirect(request: NextRequest, next: string) {
  const signInUrl = new URL("/auth/sign-in", request.url);
  signInUrl.searchParams.set("error", "auth");
  if (next !== "/app") {
    signInUrl.searchParams.set("next", next);
  }
  return NextResponse.redirect(signInUrl);
}

function createCallbackClient(
  request: NextRequest,
  response: NextResponse
) {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) {
    return null;
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const oauthError = searchParams.get("error");
  const next = safeNextPath(searchParams.get("next"));

  if (oauthError) {
    console.error(
      "[auth/callback] OAuth provider error:",
      oauthError,
      searchParams.get("error_description")
    );
    return signInErrorRedirect(request, next);
  }

  let response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createCallbackClient(request, response);
  if (!supabase) {
    console.error("[auth/callback] Supabase is not configured");
    return signInErrorRedirect(request, next);
  }

  async function finishAuthRedirect(
    client: NonNullable<typeof supabase>
  ) {
    const {
      data: { user },
    } = await client.auth.getUser();
    const destination = user
      ? await resolvePostLoginPath(client, user.id, next)
      : next;

    if (destination === next) {
      return response;
    }

    const redirectWithCookies = NextResponse.redirect(
      new URL(destination, request.url)
    );
    response.cookies.getAll().forEach((cookie) => {
      redirectWithCookies.cookies.set(cookie.name, cookie.value);
    });
    return redirectWithCookies;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return finishAuthRedirect(supabase);
    }
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    return signInErrorRedirect(request, next);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      return finishAuthRedirect(supabase);
    }
    console.error("[auth/callback] verifyOtp:", error.message);
    return signInErrorRedirect(request, next);
  }

  console.error("[auth/callback] Missing auth code or token");
  return signInErrorRedirect(request, next);
}
