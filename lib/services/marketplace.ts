import { getAdminQueryClient } from "@/lib/services/admin";
import { buildMarketplaceBookingUrl } from "@/lib/marketplace/booking-link";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";
import type { MarketplaceListing } from "@/types/marketplace";
type MarketplaceCompanyRow = {
  id: string;
  name: string;
  slug: string;
  marketplace_summary: string | null;
  marketplace_location: string | null;
  marketplace_featured: boolean | null;
  listed_in_marketplace: boolean | null;
  industries: { name: string; slug: string } | { name: string; slug: string }[] | null;
  websites: Array<{
    id: string;
    subdomain: string;
    domain: string | null;
    status: string;
    seo_description: string | null;
  }> | {
    id: string;
    subdomain: string;
    domain: string | null;
    status: string;
    seo_description: string | null;
  } | null;
};

const MARKETPLACE_SELECT = `
  id,
  name,
  slug,
  marketplace_summary,
  marketplace_location,
  marketplace_featured,
  listed_in_marketplace,
  industries ( name, slug ),
  websites!inner ( id, subdomain, domain, status, seo_description )
`;

function normalizeIndustry(
  industries: MarketplaceCompanyRow["industries"]
): { name: string; slug: string | null } {
  if (!industries) return { name: "Services", slug: null };
  const row = Array.isArray(industries) ? industries[0] : industries;
  return {
    name: row?.name ?? "Services",
    slug: row?.slug ?? null,
  };
}

type MarketplaceWebsite = {
  id: string;
  subdomain: string;
  domain: string | null;
  status: string;
  seo_description: string | null;
};

function normalizeWebsites(
  websites: MarketplaceCompanyRow["websites"]
): MarketplaceWebsite[] {
  if (!websites) return [];
  return Array.isArray(websites) ? websites : [websites];
}

function rowToListing(row: MarketplaceCompanyRow): MarketplaceListing | null {
  const website = normalizeWebsites(row.websites).find((w) => w.status === "published");
  if (!website) return null;

  const industry = normalizeIndustry(row.industries);
  const previewPath = `/preview/${website.id}`;
  const publicUrl = website.domain
    ? `https://${website.domain.replace(/^https?:\/\//, "")}`
    : null;

  return {
    companyId: row.id,
    slug: row.slug,
    name: row.name,
    industry: industry.name,
    industrySlug: industry.slug,
    summary: row.marketplace_summary,
    location: row.marketplace_location,
    featured: Boolean(row.marketplace_featured),
    websiteId: website.id,
    websitePreviewPath: previewPath,
    websitePublicUrl: publicUrl,
    seoDescription: website.seo_description,
    listedInMarketplace: Boolean(row.listed_in_marketplace),
  };
}

async function marketplaceQueryClient() {
  const admin = await getAdminQueryClient();
  return admin;
}

export async function listMarketplaceBusinesses(): Promise<MarketplaceListing[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await marketplaceQueryClient();
  const { data, error } = await supabase
    .from("companies")
    .select(MARKETPLACE_SELECT)
    .eq("listed_in_marketplace", true)
    .eq("websites.status", "published")
    .order("marketplace_featured", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[marketplace] listMarketplaceBusinesses", error.message);
    return [];
  }

  return ((data ?? []) as MarketplaceCompanyRow[])
    .map(rowToListing)
    .filter((row): row is MarketplaceListing => row !== null);
}

export async function getMarketplaceBusinessBySlug(
  slug: string
): Promise<MarketplaceListing | null> {
  if (!isSupabaseConfigured() || !slug.trim()) return null;

  const supabase = await marketplaceQueryClient();
  const { data, error } = await supabase
    .from("companies")
    .select(MARKETPLACE_SELECT)
    .eq("slug", slug.trim())
    .eq("listed_in_marketplace", true)
    .eq("websites.status", "published")
    .maybeSingle();

  if (error) {
    console.error("[marketplace] getMarketplaceBusinessBySlug", error.message);
    return null;
  }

  if (!data) return null;
  return rowToListing(data as MarketplaceCompanyRow);
}

/** Public anon-safe read when marketplace RLS migration is applied. */
export async function getMarketplaceBusinessBySlugPublic(
  slug: string
): Promise<MarketplaceListing | null> {
  if (!isSupabaseConfigured() || !slug.trim()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(MARKETPLACE_SELECT)
    .eq("slug", slug.trim())
    .eq("listed_in_marketplace", true)
    .eq("websites.status", "published")
    .maybeSingle();

  if (error) {
    console.error("[marketplace] getMarketplaceBusinessBySlugPublic", error.message);
    return getMarketplaceBusinessBySlug(slug);
  }

  if (!data) return null;
  return rowToListing(data as MarketplaceCompanyRow);
}

export async function listMarketplaceBusinessesPublic(): Promise<MarketplaceListing[]> {
  if (!isSupabaseConfigured()) return [];

  const adminList = await listMarketplaceBusinesses();
  if (adminList.length > 0) return adminList;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(MARKETPLACE_SELECT)
    .eq("listed_in_marketplace", true)
    .eq("websites.status", "published")
    .order("marketplace_featured", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[marketplace] listMarketplaceBusinessesPublic", error.message);
    return [];
  }

  return ((data ?? []) as MarketplaceCompanyRow[])
    .map(rowToListing)
    .filter((row): row is MarketplaceListing => row !== null);
}

/** Booking URL for tenant sites when the company is marketplace-listed. */
export async function getMarketplaceBookingUrlForClient(
  clientId: string
): Promise<string | null> {
  if (!isSupabaseConfigured() || !clientId.trim()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("slug, listed_in_marketplace")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    console.error("[marketplace] getMarketplaceBookingUrlForClient", error.message);
    const admin = await getAdminQueryClient();
    if (!admin) return null;
    const { data: fallback, error: fallbackError } = await admin
      .from("companies")
      .select("slug, listed_in_marketplace")
      .eq("id", clientId)
      .maybeSingle();
    if (fallbackError || !fallback?.listed_in_marketplace || !fallback.slug) {
      return null;
    }
    return buildMarketplaceBookingUrl(fallback.slug);
  }

  if (!data?.listed_in_marketplace || !data.slug) return null;
  return buildMarketplaceBookingUrl(data.slug);
}
