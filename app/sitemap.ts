import type { MetadataRoute } from "next";

import { INDUSTRY_CARDS } from "@/lib/data/home-marketing";
import { FARAIOS_MARKETING_PATHS } from "@/lib/seo/platform-metadata";
import { getTenantSitemapExtras } from "@/lib/services/tenant-seo";
import { listMarketplaceBusinessesPublic } from "@/lib/services/marketplace";
import { FARAIOS_TENANT_DOMAIN_SUFFIX } from "@/lib/constants/tenant-domain";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { getMainAppDomain } from "@/lib/services/websites";

export const revalidate = 3600;

type PublishedWebsite = {
  domain: string | null;
  subdomain: string | null;
  status: string;
  created_at: string | null;
  client_id: string | null;
};

function resolveSitemapBaseUrl(): string {
  const appHost = getMainAppDomain();
  if (appHost) return `https://${appHost}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      return new URL(appUrl).origin;
    } catch {
      /* fall through */
    }
  }

  return "https://faraios.com";
}

function buildPlatformUrls(base: string, now: Date): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [];

  for (const path of FARAIOS_MARKETING_PATHS) {
    urls.push({
      url: path === "/" ? `${base}/` : `${base}${path}`,
      lastModified: now,
    });
  }

  for (const industry of INDUSTRY_CARDS) {
    urls.push({
      url: `${base}/industries/${industry.slug}`,
      lastModified: now,
    });
  }

  return urls;
}

async function listPublishedWebsites(): Promise<PublishedWebsite[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("websites")
      .select("domain,subdomain,status,created_at,client_id")
      .eq("status", "published");

    if (error) {
      console.error("[sitemap] websites query failed:", error.message);
      return [];
    }

    return (data ?? []) as PublishedWebsite[];
  } catch (error) {
    console.error("[sitemap] websites query threw:", error);
    return [];
  }
}

async function buildTenantUrls(
  websites: PublishedWebsite[]
): Promise<MetadataRoute.Sitemap> {
  const tenantEntries = await Promise.all(
    websites.map(async (website) => {
      const host =
        (typeof website.domain === "string" && website.domain.trim()) ||
        (typeof website.subdomain === "string" && website.subdomain.trim()
          ? `${website.subdomain}.${FARAIOS_TENANT_DOMAIN_SUFFIX}`
          : "");
      if (!host) return [];

      const lastModified = new Date(website.created_at ?? new Date().toISOString());
      const hostBase = `https://${host.replace(/^https?:\/\//, "")}`;
      const companyId = website.client_id;
      let extraPaths: string[] = [];

      if (companyId) {
        try {
          extraPaths = await getTenantSitemapExtras(companyId);
        } catch (error) {
          console.error("[sitemap] tenant extras failed:", companyId, error);
        }
      }

      return [
        { url: `${hostBase}/`, lastModified },
        { url: `${hostBase}/services`, lastModified },
        { url: `${hostBase}/about`, lastModified },
        { url: `${hostBase}/reviews`, lastModified },
        { url: `${hostBase}/contact`, lastModified },
        ...extraPaths.map((path) => ({ url: `${hostBase}${path}`, lastModified })),
      ];
    })
  );

  return tenantEntries.flat();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = resolveSitemapBaseUrl();
  const urls = buildPlatformUrls(base, now);

  try {
    const marketplaceListings = await listMarketplaceBusinessesPublic();
    for (const listing of marketplaceListings) {
      urls.push({
        url: `${base}/marketplace/${encodeURIComponent(listing.slug)}`,
        lastModified: now,
      });
    }
  } catch (error) {
    console.error("[sitemap] marketplace listings failed:", error);
  }

  try {
    const websites = await listPublishedWebsites();
    urls.push(...(await buildTenantUrls(websites)));
  } catch (error) {
    console.error("[sitemap] tenant websites failed:", error);
  }

  return urls;
}
