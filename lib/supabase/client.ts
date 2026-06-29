import { createBrowserClient } from "@supabase/ssr";

import { recoverBrowserAuthSession } from "@/lib/auth/invalid-refresh-token";
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
let browserRecoveryStarted = false;

function ensureBrowserAuthRecovery(client: ReturnType<typeof createBrowserClient>) {
  if (browserRecoveryStarted || typeof window === "undefined") return;
  browserRecoveryStarted = true;
  void recoverBrowserAuthSession(client);
}

/** Singleton for client components (call only in the browser / event handlers). */
export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient() must run in the browser.");
  }
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
    ensureBrowserAuthRecovery(browserClient);
  }
  return browserClient;
}
