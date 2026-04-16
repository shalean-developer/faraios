import { createBrowserClient } from "@supabase/ssr";

/**
 * Shared browser Supabase client.
 * Keep this file for simple client-component data fetching patterns.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
