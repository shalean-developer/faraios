import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { getMainAppDomain } from "@/lib/services/websites";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: websites } = await supabase
    .from("websites")
    .select("domain,subdomain,status,created_at")
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
        ? `${website.subdomain}.faraios.com`
        : "");
    if (!host) continue;
    const lastModified = new Date(
      (website as { created_at?: string }).created_at ?? new Date().toISOString()
    );
    const hostBase = `https://${host}`;
    urls.push(
      { url: `${hostBase}/`, lastModified },
      { url: `${hostBase}/services`, lastModified },
      { url: `${hostBase}/about`, lastModified },
      { url: `${hostBase}/contact`, lastModified }
    );
  }

  return urls;
}
