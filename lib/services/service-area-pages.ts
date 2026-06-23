import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { ServiceAreaPage } from "@/types/growth-engine";

export type ServiceAreaPageInput = {
  slug?: string;
  serviceName: string;
  areaName: string;
  seoTitle?: string;
  metaDescription?: string;
  h1?: string;
  introContent?: string;
  servicesOffered?: string[];
  nearbyAreas?: string[];
  faq?: { question: string; answer: string }[];
  ctaText?: string;
  status?: "draft" | "published";
  websiteId?: string | null;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapRow(row: Record<string, unknown>): ServiceAreaPage {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    website_id: (row.website_id as string) ?? null,
    slug: row.slug as string,
    service_name: row.service_name as string,
    area_name: row.area_name as string,
    seo_title: (row.seo_title as string) ?? null,
    meta_description: (row.meta_description as string) ?? null,
    h1: (row.h1 as string) ?? null,
    intro_content: (row.intro_content as string) ?? null,
    services_offered: (row.services_offered as string[]) ?? [],
    nearby_areas: (row.nearby_areas as string[]) ?? [],
    faq: (row.faq as { question: string; answer: string }[]) ?? [],
    cta_text: (row.cta_text as string) ?? null,
    status: row.status as "draft" | "published",
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function generateServiceAreaSlug(serviceName: string, areaName: string): string {
  return slugify(`${serviceName}-in-${areaName}`);
}

export function generateDefaultServiceAreaContent(
  serviceName: string,
  areaName: string,
  businessName: string
): Pick<
  ServiceAreaPageInput,
  "seoTitle" | "metaDescription" | "h1" | "introContent" | "ctaText"
> {
  const title = `${serviceName} in ${areaName}`;
  return {
    seoTitle: `${title} | ${businessName}`,
    metaDescription: `Professional ${serviceName.toLowerCase()} in ${areaName}. ${businessName} serves ${areaName} and nearby areas. Book online today.`,
    h1: title,
    introContent: `${businessName} provides trusted ${serviceName.toLowerCase()} throughout ${areaName}. Our local team understands the area and delivers reliable, professional service.`,
    ctaText: `Book ${serviceName} in ${areaName}`,
  };
}

export async function listServiceAreaPages(
  companyId: string
): Promise<ServiceAreaPage[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data, error } = await admin.client
    .from("service_area_pages")
    .select("*")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[service_area_pages] listServiceAreaPages", error.message);
    return [];
  }

  return (data ?? []).map(mapRow);
}

export async function getPublishedServiceAreaPage(
  companyId: string,
  slug: string
): Promise<ServiceAreaPage | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("service_area_pages")
    .select("*")
    .eq("company_id", companyId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return data ? mapRow(data) : null;
}

export async function createServiceAreaPage(
  companyId: string,
  input: ServiceAreaPageInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const slug = input.slug || generateServiceAreaSlug(input.serviceName, input.areaName);

  const { data, error } = await admin.client
    .from("service_area_pages")
    .insert({
      company_id: companyId,
      website_id: input.websiteId ?? null,
      slug,
      service_name: input.serviceName,
      area_name: input.areaName,
      seo_title: input.seoTitle ?? null,
      meta_description: input.metaDescription ?? null,
      h1: input.h1 ?? null,
      intro_content: input.introContent ?? null,
      services_offered: input.servicesOffered ?? [],
      nearby_areas: input.nearbyAreas ?? [],
      faq: input.faq ?? [],
      cta_text: input.ctaText ?? null,
      status: input.status ?? "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[service_area_pages] createServiceAreaPage", error?.message);
    return { ok: false, error: error?.message ?? "Failed to create page." };
  }
  return { ok: true, id: data.id as string };
}

export async function updateServiceAreaPage(
  companyId: string,
  pageId: string,
  input: Partial<ServiceAreaPageInput>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.serviceName !== undefined) payload.service_name = input.serviceName;
  if (input.areaName !== undefined) payload.area_name = input.areaName;
  if (input.seoTitle !== undefined) payload.seo_title = input.seoTitle;
  if (input.metaDescription !== undefined) payload.meta_description = input.metaDescription;
  if (input.h1 !== undefined) payload.h1 = input.h1;
  if (input.introContent !== undefined) payload.intro_content = input.introContent;
  if (input.servicesOffered !== undefined) payload.services_offered = input.servicesOffered;
  if (input.nearbyAreas !== undefined) payload.nearby_areas = input.nearbyAreas;
  if (input.faq !== undefined) payload.faq = input.faq;
  if (input.ctaText !== undefined) payload.cta_text = input.ctaText;
  if (input.status !== undefined) payload.status = input.status;

  const { error } = await admin.client
    .from("service_area_pages")
    .update(payload)
    .eq("id", pageId)
    .eq("company_id", companyId);

  if (error) {
    console.error("[service_area_pages] updateServiceAreaPage", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function bulkGenerateServiceAreaPages(
  companyId: string,
  businessName: string,
  serviceNames: string[],
  areaNames: string[]
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const existing = await listServiceAreaPages(companyId);
  const existingSlugs = new Set(existing.map((p) => p.slug));
  let created = 0;

  for (const serviceName of serviceNames) {
    for (const areaName of areaNames) {
      const slug = generateServiceAreaSlug(serviceName, areaName);
      if (existingSlugs.has(slug)) continue;

      const defaults = generateDefaultServiceAreaContent(serviceName, areaName, businessName);
      const result = await createServiceAreaPage(companyId, {
        slug,
        serviceName,
        areaName,
        ...defaults,
        status: "draft",
      });
      if (result.ok) {
        created++;
        existingSlugs.add(slug);
      }
    }
  }

  return { ok: true, created };
}
