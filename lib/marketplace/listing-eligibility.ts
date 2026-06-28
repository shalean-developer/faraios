import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketplaceListingEligibility = {
  hasWebsite: boolean;
  websiteId: string | null;
  websitePublished: boolean;
  canList: boolean;
  blockReason: string | null;
};

export const MARKETPLACE_LISTING_REQUIRES_WEBSITE =
  "Create a website for this business before listing it on the marketplace.";

export const MARKETPLACE_LISTING_REQUIRES_PUBLISH =
  "Publish the website before listing this business on the marketplace.";

export async function getCompanyMarketplaceListingEligibility(
  supabase: SupabaseClient,
  companyId: string
): Promise<MarketplaceListingEligibility> {
  const { data: website, error } = await supabase
    .from("websites")
    .select("id, status")
    .eq("client_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[marketplace] getCompanyMarketplaceListingEligibility", error.message);
  }

  if (!website?.id) {
    return {
      hasWebsite: false,
      websiteId: null,
      websitePublished: false,
      canList: false,
      blockReason: MARKETPLACE_LISTING_REQUIRES_WEBSITE,
    };
  }

  const websitePublished = website.status === "published";
  if (!websitePublished) {
    return {
      hasWebsite: true,
      websiteId: website.id as string,
      websitePublished: false,
      canList: false,
      blockReason: MARKETPLACE_LISTING_REQUIRES_PUBLISH,
    };
  }

  return {
    hasWebsite: true,
    websiteId: website.id as string,
    websitePublished: true,
    canList: true,
    blockReason: null,
  };
}
