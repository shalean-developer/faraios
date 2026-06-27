import { loadIndustryModule } from "@/lib/industry-modules/loader";
import { publicBookPath } from "@/lib/paths/company";
import { slugifyBusinessName } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { CompanyWithIndustry } from "@/types/database";
import type {
  BuilderWebsite,
  DomainSettingsRecord,
  LandingPageContent,
  WebsiteEnquiryRecord,
  WebsitePageRecord,
  WebsiteServicePageRecord,
} from "@/types/website-builder";
import type { WebsiteComponentRecord } from "@/types/website-builder-components";
import type { WebsiteMediaRecord } from "@/types/website-builder-media";

import {
  getDnsRecordsForDomain,
  getWebsiteDomainsForCompany,
} from "@/lib/services/website-domains";
import { getPleskHostingTarget } from "@/lib/hosting/plesk/target";
import { buildWebsiteDomainDnsHelp } from "@/lib/hosting/website-domain-dns-help";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";

import { publicSiteUrl } from "./access";
import { getWebsiteMediaForCompany } from "./media";
import { mapWebsite } from "./map-website";
import { getBuilderSettings, isPreviewTokenValid } from "./settings";
import { listPublishedContentPosts } from "@/lib/services/content-posts";

export function buildLandingContentFromCompany(
  company: CompanyWithIndustry,
  services: { name: string; description: string | null; base_price_cents: number }[]
): LandingPageContent {
  const industrySlug = company.industries?.slug ?? "default";
  const industryModule = loadIndustryModule(industrySlug);
  const location = company.contact_location ?? company.service_areas ?? "";

  return {
    hero: {
      headline: company.name,
      subheadline:
        company.business_description ??
        industryModule.growth.heroSubtitle ??
        `Professional ${industryModule.growth.serviceLabel} services`,
      ctaLabel: "Book Now",
      imageUrl: company.brand_logo_url ?? null,
    },
    about: {
      heading: `About ${company.name}`,
      body:
        company.business_description ??
        `We are a trusted ${industryModule.name.toLowerCase()} business serving ${location || "our local community"}.`,
    },
    services: {
      heading: "Our Services",
      items: services.slice(0, 6).map((s) => ({
        title: s.name,
        description: s.description ?? "",
        priceFrom:
          s.base_price_cents > 0
            ? `From R${Math.round(s.base_price_cents / 100)}`
            : undefined,
      })),
    },
    whyChooseUs: {
      heading: "Why choose us",
      items: [
        "Experienced team",
        "Transparent pricing",
        "Easy online booking",
        location ? `Serving ${location}` : "Local service you can trust",
      ],
    },
    contact: {
      heading: "Get in touch",
      phone: company.contact_phone ?? null,
      email: company.primary_contact_email ?? null,
      location: company.contact_location ?? null,
      hours: null,
    },
    footer: {
      businessName: company.name,
      tagline: industryModule.growth.serviceLabel,
    },
  };
}

export function defaultSeoForWebsite(company: CompanyWithIndustry): {
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
} {
  const location = company.contact_location ?? company.service_areas ?? "";
  const industry = company.industries?.name ?? "services";
  return {
    seo_title: `${company.name} | ${industry}${location ? ` in ${location}` : ""}`,
    seo_description:
      company.business_description?.slice(0, 155) ??
      `Book ${company.name} online. ${industry} services${location ? ` in ${location}` : ""}.`,
    seo_keywords: [company.name, industry, location].filter(Boolean).join(", "),
  };
}

export async function getBuilderWebsiteForCompany(
  companyId: string
): Promise<BuilderWebsite | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("client_id", companyId)
    .eq("builder_mode", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapWebsite(data as Record<string, unknown>);
}

export async function getPublishedBuilderWebsiteByCompanySlug(
  companySlug: string
): Promise<{ website: BuilderWebsite; companyId: string } | null> {
  const admin = tryCreateAdminClient();
  const client = admin.ok ? admin.client : await createClient();

  const { data: company } = await client
    .from("companies")
    .select("id, slug")
    .eq("slug", companySlug)
    .maybeSingle();

  if (!company?.id) return null;

  const { data } = await client
    .from("websites")
    .select("*")
    .eq("client_id", company.id)
    .eq("builder_mode", true)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;
  return {
    website: mapWebsite(data as Record<string, unknown>),
    companyId: company.id as string,
  };
}

export async function listWebsiteComponents(websiteId: string): Promise<WebsiteComponentRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("website_components")
    .select("*")
    .eq("website_id", websiteId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as WebsiteComponentRecord[];
}

export async function getBuilderDashboardData(companyId: string) {
  const website = await getBuilderWebsiteForCompany(companyId);
  if (!website) return null;

  const [pages, servicePages, enquiries, domainSettings, savedComponents, mediaItems, websiteDomains] =
    await Promise.all([
    listWebsitePages(website.id),
    listServicePages(website.id),
    listWebsiteEnquiries(companyId),
    getDomainSettings(website.id),
    listWebsiteComponents(website.id),
    getWebsiteMediaForCompany(website.id, companyId),
    getWebsiteDomainsForCompany(companyId),
  ]);

  const dnsByDomain: Record<string, WebsiteDnsRecord[]> = {};
  await Promise.all(
    websiteDomains.map(async (domain) => {
      dnsByDomain[domain.id] = await getDnsRecordsForDomain(domain.id);
    })
  );

  const pleskDnsTarget = await getPleskHostingTarget({ companyId });
  const domainDnsHelp = buildWebsiteDomainDnsHelp(pleskDnsTarget);

  const landingPage = pages.find((p) => p.page_type === "landing") ?? null;

  return {
    website,
    pages,
    landingPage,
    landingContent: (landingPage?.content ?? null) as LandingPageContent | null,
    servicePages,
    enquiries,
    domainSettings,
    websiteDomains,
    dnsByDomain,
    domainDnsHelp,
    savedComponents,
    mediaItems,
  };
}

export async function ensureBuilderWebsite(
  company: CompanyWithIndustry
): Promise<{ ok: true; website: BuilderWebsite } | { ok: false; error: string }> {
  const existing = await getBuilderWebsiteForCompany(company.id);
  if (existing) return { ok: true, website: existing };

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: "Could not initialize website builder." };
  }

  const seo = defaultSeoForWebsite(company);
  const siteSlug = company.slug;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const defaultUrl = publicSiteUrl(siteSlug, appUrl);

  const { data: website, error } = await admin.client
    .from("websites")
    .insert({
      client_id: company.id,
      name: company.name,
      title: company.name,
      description: company.business_description,
      industry: company.industries?.slug ?? "default",
      template: "service-business",
      subdomain: slugifyBusinessName(company.name).slice(0, 48),
      slug: siteSlug,
      status: "draft",
      builder_mode: true,
      theme_settings: {
        primaryColor: company.brand_primary_color ?? "#6366f1",
        accentColor: company.brand_accent_color ?? "#4f46e5",
        logoUrl: company.brand_logo_url ?? null,
        bookingButtonLabel: "Book Now",
      },
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
      seo_keywords: seo.seo_keywords,
      og_title: seo.seo_title,
      og_description: seo.seo_description,
      booking_enabled: true,
    })
    .select("*")
    .single();

  if (error || !website) {
    return { ok: false, error: error?.message ?? "Could not create website." };
  }

  const websiteId = website.id as string;

  const { data: services } = await admin.client
    .from("company_services")
    .select("name, description, base_price_cents")
    .eq("company_id", company.id)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .limit(12);

  const landing = buildLandingContentFromCompany(
    company,
    (services ?? []) as { name: string; description: string | null; base_price_cents: number }[]
  );

  await admin.client.from("website_pages").insert({
    website_id: websiteId,
    company_id: company.id,
    page_type: "landing",
    title: "Home",
    slug: "home",
    content: landing,
    status: "draft",
    seo_title: seo.seo_title,
    seo_description: seo.seo_description,
    og_title: seo.seo_title,
    og_description: seo.seo_description,
  });

  await admin.client.from("domain_settings").insert({
    website_id: websiteId,
    company_id: company.id,
    default_url: defaultUrl,
    requested_subdomain: siteSlug,
    custom_domain_status: "not_connected",
  });

  return { ok: true, website: mapWebsite(website as Record<string, unknown>) };
}

export async function listWebsitePages(websiteId: string): Promise<WebsitePageRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("website_pages")
    .select("*")
    .eq("website_id", websiteId)
    .order("created_at", { ascending: true });
  return (data ?? []) as WebsitePageRecord[];
}

export async function listServicePages(websiteId: string): Promise<WebsiteServicePageRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("website_service_pages")
    .select("*")
    .eq("website_id", websiteId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => ({
    ...row,
    benefits: Array.isArray(row.benefits) ? row.benefits : [],
    faqs: Array.isArray(row.faqs) ? row.faqs : [],
  })) as WebsiteServicePageRecord[];
}

export async function listWebsiteEnquiries(
  companyId: string
): Promise<WebsiteEnquiryRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("website_enquiries")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as WebsiteEnquiryRecord[];
}

export async function getDomainSettings(
  websiteId: string
): Promise<DomainSettingsRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("domain_settings")
    .select("*")
    .eq("website_id", websiteId)
    .maybeSingle();
  return (data as DomainSettingsRecord) ?? null;
}

export async function syncDomainSettingsCustomDomain(input: {
  websiteId: string;
  companyId: string;
  customDomain: string | null;
  customDomainStatus: string;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  const { data: existing } = await admin.client
    .from("domain_settings")
    .select("id")
    .eq("website_id", input.websiteId)
    .maybeSingle();

  const patch = {
    custom_domain: input.customDomain,
    custom_domain_status: input.customDomainStatus,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await admin.client.from("domain_settings").update(patch).eq("website_id", input.websiteId);
    return;
  }

  await admin.client.from("domain_settings").insert({
    website_id: input.websiteId,
    company_id: input.companyId,
    ...patch,
  });
}

export function bookingUrlForCompany(
  companyId: string,
  serviceId?: string | null
): string {
  const base = publicBookPath(companyId);
  if (!serviceId) return base;
  return `${base}?service=${encodeURIComponent(serviceId)}`;
}

export async function getPublicBuilderSiteData(
  companySlug: string,
  options?: { previewToken?: string }
) {
  const admin = tryCreateAdminClient();
  const client = admin.ok ? admin.client : await createClient();

  const { data: company } = await client
    .from("companies")
    .select("id, slug, name, brand_logo_url, brand_primary_color, brand_accent_color")
    .eq("slug", companySlug)
    .maybeSingle();

  if (!company?.id) return null;

  let website: BuilderWebsite | null = null;
  let draftMode = false;

  if (options?.previewToken) {
    const { data } = await client
      .from("websites")
      .select("*")
      .eq("client_id", company.id)
      .eq("builder_mode", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    const mapped = mapWebsite(data as Record<string, unknown>);
    const settings = getBuilderSettings({
      website: mapped,
      bookingEnabled: mapped.booking_enabled,
    });

    if (!isPreviewTokenValid(settings, options.previewToken)) return null;

    website = mapped;
    draftMode = true;
  } else {
    const resolved = await getPublishedBuilderWebsiteByCompanySlug(companySlug);
    if (!resolved) return null;
    website = resolved.website;
  }

  const pageStatus = draftMode ? undefined : "published";
  const serviceStatus = draftMode ? undefined : "published";

  const pagesQuery = client.from("website_pages").select("*").eq("website_id", website.id);
  const servicePagesQuery = client
    .from("website_service_pages")
    .select("*")
    .eq("website_id", website.id);

  const [pagesRes, servicePagesRes, contentPosts] = await Promise.all([
    pageStatus ? pagesQuery.eq("status", pageStatus) : pagesQuery,
    serviceStatus ? servicePagesQuery.eq("status", serviceStatus) : servicePagesQuery,
    draftMode ? Promise.resolve([]) : listPublishedContentPosts(company.id as string),
  ]);

  return {
    website,
    company,
    pages: (pagesRes.data ?? []) as WebsitePageRecord[],
    servicePages: (servicePagesRes.data ?? []) as WebsiteServicePageRecord[],
    contentPosts,
    bookingUrl: bookingUrlForCompany(company.id as string),
    preview: draftMode,
  };
}
