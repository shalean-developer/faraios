import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSite } from "@/components/website-builder/public-site";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mapWebsite } from "@/lib/website-builder/map-website";
import type { WebsiteServicePageRecord } from "@/types/website-builder";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ businessSlug: string; serviceSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessSlug, serviceSlug } = await params;
  const data = await loadPublishedServicePage(businessSlug, serviceSlug);
  if (!data) return { title: "Service not found" };
  const page = data.servicePage;
  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? page.description ?? undefined,
  };
}

async function loadPublishedServicePage(companySlug: string, serviceSlug: string) {
  const admin = tryCreateAdminClient();
  const client = admin.ok ? admin.client : await createClient();

  const { data: company } = await client
    .from("companies")
    .select("id, name, slug")
    .eq("slug", companySlug)
    .maybeSingle();

  if (!company?.id) return null;

  const { data: website } = await client
    .from("websites")
    .select("*")
    .eq("client_id", company.id)
    .eq("builder_mode", true)
    .eq("status", "published")
    .maybeSingle();

  if (!website) return null;

  const { data: servicePage } = await client
    .from("website_service_pages")
    .select("*")
    .eq("website_id", website.id)
    .eq("slug", serviceSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!servicePage) return null;

  return {
    company,
    website: mapWebsite(website as Record<string, unknown>),
    servicePage: {
      ...servicePage,
      benefits: Array.isArray(servicePage.benefits) ? servicePage.benefits : [],
      faqs: Array.isArray(servicePage.faqs) ? servicePage.faqs : [],
    } as WebsiteServicePageRecord,
  };
}

export default async function PublicServicePage({ params }: Props) {
  const { businessSlug, serviceSlug } = await params;
  const slug = decodeURIComponent(businessSlug);
  const service = decodeURIComponent(serviceSlug);
  const data = await loadPublishedServicePage(slug, service);

  if (!data) notFound();

  return (
    <PublicSite
      companySlug={slug}
      companyId={data.company.id as string}
      companyName={data.company.name as string}
      website={data.website}
      landing={null}
      servicePage={data.servicePage}
    />
  );
}
