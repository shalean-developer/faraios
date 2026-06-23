import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { getTenantSitemapExtras } from "@/lib/services/tenant-seo";
import { FARAIOS_TENANT_DOMAIN_SUFFIX } from "@/lib/constants/tenant-domain";
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

  if (base) {
    urls.push({
      url: `${base}/`,
      lastModified: new Date(),
    });
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
