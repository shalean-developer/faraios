import type { MetadataRoute } from "next";

import { INDUSTRY_CARDS } from "@/lib/data/home-marketing";
import { FARAIOS_MARKETING_PATHS } from "@/lib/seo/platform-metadata";
import { getTenantSitemapExtras } from "@/lib/services/tenant-seo";
import { listMarketplaceBusinessesPublic } from "@/lib/services/marketplace";
import { FARAIOS_TENANT_DOMAIN_SUFFIX } from "@/lib/constants/tenant-domain";
import { createClient } from "@/lib/supabase/server";
import { getMainAppDomain } from "@/lib/services/websites";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: websites } = await supabase
    .from("websites")
    .select("domain,subdomain,status,created_at,client_id")
    .eq("status", "published");

  const appHost = getMainAppDomain();
  const base = appHost ? `https://${appHost}` : null;
  const urls: MetadataRoute.Sitemap = [];
  const now = new Date();

  if (base) {
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

    const marketplaceListings = await listMarketplaceBusinessesPublic();
    for (const listing of marketplaceListings) {
      urls.push({
        url: `${base}/marketplace/${encodeURIComponent(listing.slug)}`,
        lastModified: now,
      });
    }
  }

  for (const website of websites ?? []) {
    const host =
      (typeof website.domain === "string" && website.domain.trim()) ||
      (typeof website.subdomain === "string" && website.subdomain.trim()
        ? `${website.subdomain}.${FARAIOS_TENANT_DOMAIN_SUFFIX}`
        : "");
    if (!host) continue;
    const lastModified = new Date(
      (website as { created_at?: string }).created_at ?? new Date().toISOString()
    );
    const hostBase = `https://${host}`;
    const companyId = (website as { client_id?: string }).client_id;
    const extraPaths = companyId ? await getTenantSitemapExtras(companyId) : [];

    urls.push(
      { url: `${hostBase}/`, lastModified },
      { url: `${hostBase}/services`, lastModified },
      { url: `${hostBase}/about`, lastModified },
      { url: `${hostBase}/reviews`, lastModified },
      { url: `${hostBase}/contact`, lastModified },
      ...extraPaths.map((path) => ({ url: `${hostBase}${path}`, lastModified }))
    );
  }

  return urls;
}
