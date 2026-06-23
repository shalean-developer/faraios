import type { SupabaseClient } from "@supabase/supabase-js";

import { tryCreateAdminClient } from "@/lib/supabase/admin";

async function isPlatformAdminViaServiceRole(
  userId: string
): Promise<boolean | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return null;
  }

  const { data, error } = await admin.client
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] isPlatformAdminUser service role", error.message);
    return false;
  }

  return Boolean(data?.user_id);
}

/**
 * Checks whether a user is a platform admin without hitting recursive RLS.
 * Prefers the security-definer RPC; falls back to service role on the server.
 */
export async function isPlatformAdminUser(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_admin");

  if (!error) {
    return Boolean(data);
  }

  const serviceRoleResult = await isPlatformAdminViaServiceRole(userId);
  if (serviceRoleResult !== null) {
    return serviceRoleResult;
  }

  console.error("[auth] isPlatformAdminUser", error.message);
  return false;
}
