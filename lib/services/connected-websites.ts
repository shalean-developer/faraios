import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { ConnectedWebsite } from "@/types/database";

export async function getConnectedWebsiteForCompany(
  companyId: string
): Promise<ConnectedWebsite | null> {
  if (!isSupabaseConfigured() || !companyId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
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
