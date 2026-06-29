import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

export function isInvalidRefreshTokenError(
  error: AuthError | null | undefined
): boolean {
  if (!error) return false;

  return (
    error.code === "refresh_token_not_found" ||
    /invalid refresh token/i.test(error.message) ||
    /refresh token not found/i.test(error.message)
  );
}

export function hasSupabaseAuthCookies(): boolean {
  if (typeof document === "undefined") return false;

  return document.cookie
    .split(";")
    .some((part) => {
      const name = part.trim().split("=")[0] ?? "";
      return name.startsWith("sb-") && name.includes("auth-token");
    });
}

/** Best-effort wipe of Supabase auth cookies in the browser. */
export function clearSupabaseAuthCookies(): void {
  if (typeof document === "undefined") return;

  const names = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0] ?? "")
    .filter((name) => name.startsWith("sb-") && name.includes("auth-token"));

  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}`;
  }
}

/** Clears auth cookies/storage when the refresh token is missing or revoked. */
export async function clearStaleAuthSession(
  supabase: SupabaseClient,
  error: AuthError | null | undefined
): Promise<boolean> {
  if (!isInvalidRefreshTokenError(error)) return false;

  if (typeof window !== "undefined") {
    await supabase.auth.signOut({ scope: "local" });
    clearSupabaseAuthCookies();
    return true;
  }

  await supabase.auth.signOut();
  return true;
}

export async function safeGetUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (await clearStaleAuthSession(supabase, error)) {
    return { user: null as null, error: null as null, sessionExpired: true as const };
  }

  return { user, error, sessionExpired: false as const };
}

let browserRecoveryPromise: Promise<boolean> | null = null;

/**
 * Validates the browser session once per page load. Clears broken cookies without
 * leaving other components to retry refresh (which spams the console).
 */
export function recoverBrowserAuthSession(
  supabase: SupabaseClient
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!hasSupabaseAuthCookies()) return Promise.resolve(false);

  browserRecoveryPromise ??= (async () => {
    const { error } = await supabase.auth.getSession();
    if (!isInvalidRefreshTokenError(error)) return false;

    await supabase.auth.signOut({ scope: "local" });
    clearSupabaseAuthCookies();
    return true;
  })();

  return browserRecoveryPromise;
}

export function isProtectedAppPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/onboarding") ||
    /^\/[^/]+\/(dashboard|project)(\/|$)/.test(pathname)
  );
}

export function signInUrlForExpiredSession(pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  const url = new URL("/auth/sign-in", window.location.origin);
  url.searchParams.set("reason", "session-expired");
  if (next && next !== "/") {
    url.searchParams.set("next", next);
  }
  return `${url.pathname}${url.search}`;
}
