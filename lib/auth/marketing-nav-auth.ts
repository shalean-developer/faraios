import type { SupabaseClient } from "@supabase/supabase-js";

import { safeGetUser } from "@/lib/auth/invalid-refresh-token";
import {
  getPlatformAdminUserIds,
  isPlatformAdminUser,
} from "@/lib/auth/platform-admin";

export type MarketingNavAuthState = {
  isAuthenticated: boolean;
  companySlug: string | null;
  isPlatformAdmin: boolean;
};

export async function loadMarketingNavAuth(
  supabase: SupabaseClient
): Promise<MarketingNavAuthState> {
  const { user } = await safeGetUser(supabase);

  if (!user) {
    return { isAuthenticated: false, companySlug: null, isPlatformAdmin: false };
  }

  const isPlatformAdmin = await isPlatformAdminUser(supabase, user.id);

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.company_id) {
    return {
      isAuthenticated: true,
      companySlug: null,
      isPlatformAdmin,
    };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", membership.company_id)
    .maybeSingle();

  return {
    isAuthenticated: true,
    companySlug: company?.slug ?? null,
    isPlatformAdmin,
  };
}

export { getPlatformAdminUserIds };
