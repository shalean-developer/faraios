import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { INDUSTRY_CARDS } from "@/lib/data/home-marketing";
import { getDomain } from "@/lib/getDomain";
import { FARAIOS_MARKETING_PATHS } from "@/lib/seo/platform-metadata";
import { getTenantSitemapExtras } from "@/lib/services/tenant-seo";
import { listMarketplaceBusinessesPublic } from "@/lib/services/marketplace";
import { getMainAppDomain, getWebsiteByDomain, isMainHost } from "@/lib/services/websites";
import type { Website } from "@/types/database";

export const revalidate = 3600;

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

async function buildTenantSitemap(host: string, website: Website, now: Date): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date(website.created_at ?? now.toISOString());
  const hostBase = `https://${host.replace(/^https?:\/\//, "")}`;
  let extraPaths: string[] = [];

  try {
    extraPaths = await getTenantSitemapExtras(website.client_id);
  } catch (error) {
    console.error("[sitemap] tenant extras failed:", website.client_id, error);
  }

  return [
    { url: `${hostBase}/`, lastModified },
    { url: `${hostBase}/services`, lastModified },
    { url: `${hostBase}/about`, lastModified },
    { url: `${hostBase}/reviews`, lastModified },
    { url: `${hostBase}/contact`, lastModified },
    ...extraPaths.map((path) => ({ url: `${hostBase}${path}`, lastModified })),
  ];
}

async function buildPlatformSitemap(now: Date): Promise<MetadataRoute.Sitemap> {
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

  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const host = getDomain(await headers());

  if (!isMainHost(host)) {
    try {
      const website = await getWebsiteByDomain(host);
      if (!website || website.status !== "published") return [];
      return buildTenantSitemap(host, website, now);
    } catch (error) {
      console.error("[sitemap] tenant sitemap failed:", error);
      return [];
    }
  }

  return buildPlatformSitemap(now);
}
