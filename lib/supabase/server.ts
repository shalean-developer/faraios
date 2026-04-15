import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
