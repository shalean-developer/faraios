import { headers } from "next/headers";
import type { Metadata } from "next";

import { getDomain } from "@/lib/getDomain";
import { getMarketplaceBookingUrlForClient } from "@/lib/services/marketplace";
import type { CompanyBranding } from "@/lib/website-templates/apply-variant";
import {
  getWebsiteByDomain,
  getWebsiteContentByWebsiteId,
  isMainHost,
} from "@/lib/services/websites";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { buildTenantSocialMetadata } from "@/lib/seo/tenant-metadata";
import type { WebsiteContent } from "@/types/database";

async function getCompanyBranding(companyId: string): Promise<CompanyBranding | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("companies")
    .select("brand_logo_url, brand_primary_color, brand_accent_color")
    .eq("id", companyId)
    .maybeSingle();

  if (!data) return null;

  return {
    logoUrl: data.brand_logo_url,
    primaryColor: data.brand_primary_color,
    accentColor: data.brand_accent_color,
  };
}

export type TenantPageKind = "home" | "services" | "about" | "reviews" | "contact";

export async function getTenantContext() {
  const requestHeaders = await headers();
  const host = getDomain(requestHeaders);
  const mainHost = isMainHost(host);
  if (mainHost) {
    return {
      host,
      mainHost: true as const,
      website: null,
      content: [] as WebsiteContent[],
      marketplaceBookingUrl: null as string | null,
      publicBookingUrl: null as string | null,
      bookingUrl: null as string | null,
      companyBranding: null as CompanyBranding | null,
    };
  }

  const website = await getWebsiteByDomain(host);
  if (!website) {
    return {
      host,
      mainHost: false as const,
      website: null,
      content: [] as WebsiteContent[],
      marketplaceBookingUrl: null as string | null,
      publicBookingUrl: null as string | null,
      bookingUrl: null as string | null,
      companyBranding: null as CompanyBranding | null,
    };
  }

  const [content, marketplaceBookingUrl, companyBranding] = await Promise.all([
    getWebsiteContentByWebsiteId(website.id),
    getMarketplaceBookingUrlForClient(website.client_id),
    getCompanyBranding(website.client_id),
  ]);

  const publicBookingUrl = `/book/${encodeURIComponent(website.client_id)}`;

  return {
    host,
    mainHost: false as const,
    website,
    content,
    marketplaceBookingUrl,
    publicBookingUrl,
    bookingUrl: publicBookingUrl,
    companyBranding,
  };
}

export async function getTenantMetadata(kind: TenantPageKind): Promise<Metadata> {
  const ctx = await getTenantContext();
  if (ctx.mainHost || !ctx.website) {
    return {};
  }

  const suffix =
    kind === "home" ? "" : ` | ${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
  const title = `${ctx.website.seo_title || ctx.website.name}${suffix}`;
  const description = ctx.website.seo_description || undefined;
  const keywords = ctx.website.seo_keywords
    ? ctx.website.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : undefined;

  return {
    title,
    description,
    keywords,
    ...buildTenantSocialMetadata({
      website: ctx.website,
      title,
      description,
    }),
  };
}
