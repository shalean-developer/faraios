import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicKey, getSupabaseUrl } from "./public-env";

/**
 * Browser Supabase client — uses cookie storage via @supabase/ssr so sessions
 * match middleware and server actions.
 */
export function createBrowserSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return createBrowserClient(url, key);
}

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

/** Singleton for client components (call only in the browser / event handlers). */
export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient() must run in the browser.");
  }
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }
  return browserClient;
}
