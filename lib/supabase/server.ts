import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { safeGetUser } from "@/lib/auth/invalid-refresh-token";
import { getSupabasePublicKey, getSupabaseUrl } from "./public-env";

/**
 * Server-side Supabase client for Server Components, Route Handlers, and Server Actions.
 * Uses the public (anon/publishable) key with the user's session from cookies when present.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl()!,
    getSupabasePublicKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* ignore when called from a Server Component */
          }
        },
      },
    }
  );
}

/** Server-side auth lookup that clears invalid refresh tokens instead of retrying. */
export async function getAuthUser() {
  const supabase = await createClient();
  return safeGetUser(supabase);
}
