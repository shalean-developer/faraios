import type { SupabaseClient } from "@supabase/supabase-js";

import { isPlatformAdminUser } from "@/lib/auth/platform-admin";

export type MarketingNavAuthState = {
  isAuthenticated: boolean;
  companySlug: string | null;
  isPlatformAdmin: boolean;
};

export async function loadMarketingNavAuth(
  supabase: SupabaseClient
): Promise<MarketingNavAuthState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAuthenticated: false, companySlug: null, isPlatformAdmin: false };
  }

  const isPlatformAdmin = await isPlatformAdminUser(supabase, user.id);

  if (isPlatformAdmin) {
    return { isAuthenticated: true, companySlug: null, isPlatformAdmin: true };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.company_id) {
    return { isAuthenticated: true, companySlug: null, isPlatformAdmin: false };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", membership.company_id)
    .maybeSingle();

  return {
    isAuthenticated: true,
    companySlug: company?.slug ?? null,
    isPlatformAdmin: false,
  };
}
