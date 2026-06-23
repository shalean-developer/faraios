import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export {
  companyDashboardPath,
  companyWebsiteCreatePath,
  companyWebsiteEditPath,
  companyWebsitesPath,
} from "@/lib/paths/company";

export async function getPrimaryCompanySlugForUser(
  userId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.company_id) {
    return null;
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", membership.company_id)
    .maybeSingle();

  if (companyError || !company?.slug) {
    return null;
  }

  return company.slug as string;
}
