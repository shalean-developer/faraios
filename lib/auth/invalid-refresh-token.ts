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

/** Clears auth cookies/storage when the refresh token is missing or revoked. */
export async function clearStaleAuthSession(
  supabase: SupabaseClient,
  error: AuthError | null | undefined
): Promise<boolean> {
  if (!isInvalidRefreshTokenError(error)) return false;

  await supabase.auth.signOut();
  return true;
}

export async function safeGetUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (await clearStaleAuthSession(supabase, error)) {
    return { user: null as null, error: null as null };
  }

  return { user, error };
}
