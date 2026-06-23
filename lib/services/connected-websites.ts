import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { ConnectedWebsite } from "@/types/database";

export async function getConnectedWebsiteForCompany(
  companyId: string
): Promise<ConnectedWebsite | null> {
  if (!isSupabaseConfigured() || !companyId) return null;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data, error } = await admin.client
    .from("connected_websites")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[connected_websites] getConnectedWebsiteForCompany", error.message);
    return null;
  }

  return data as ConnectedWebsite | null;
}
