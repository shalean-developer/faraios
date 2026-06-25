import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SeoSchemaRecord, SeoSchemaType } from "@/types/seo-v10";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildLocalBusinessSchema,
  buildOrganizationSchema,
  buildServiceSchema,
} from "@/lib/services/schema-markup";
import type { LocalSeoSettings } from "@/types/growth-engine";

export const SCHEMA_TYPES: SeoSchemaType[] = [
  "Organization",
  "LocalBusiness",
  "Article",
  "BlogPosting",
  "FAQPage",
  "HowTo",
  "Product",
  "Review",
  "Recipe",
  "VideoObject",
  "Course",
  "Event",
  "Person",
  "BreadcrumbList",
  "WebSite",
  "SearchAction",
  "Custom",
];

export function validateJsonLd(jsonLd: Record<string, unknown>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!jsonLd["@context"]) errors.push("Missing @context");
  if (!jsonLd["@type"]) errors.push("Missing @type");
  try {
    JSON.stringify(jsonLd);
  } catch {
    errors.push("Invalid JSON structure");
  }
  return { isValid: errors.length === 0, errors };
}

export async function listProjectSchemas(projectId: string): Promise<SeoSchemaRecord[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_schema")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapSchema);
}

function mapSchema(row: Record<string, unknown>): SeoSchemaRecord {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    company_id: row.company_id as string,
    page_id: (row.page_id as string) ?? null,
    schema_type: row.schema_type as string,
    json_ld: (row.json_ld as Record<string, unknown>) ?? {},
    is_valid: Boolean(row.is_valid),
    validation_errors: (row.validation_errors as string[]) ?? [],
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function buildDefaultSchema(
  type: SeoSchemaType,
  input: {
    settings: LocalSeoSettings;
    websiteUrl: string;
    businessName: string;
    logoUrl?: string;
  }
): Record<string, unknown> {
  switch (type) {
    case "LocalBusiness":
      return buildLocalBusinessSchema(input);
    case "Organization":
      return buildOrganizationSchema(input);
    case "WebSite":
      return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: input.settings.business_name || input.businessName,
        url: input.websiteUrl,
      };
    case "SearchAction":
      return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        url: input.websiteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${input.websiteUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      };
    case "Article":
    case "BlogPosting":
      return {
        "@context": "https://schema.org",
        "@type": type,
        headline: "Article title",
        author: { "@type": "Person", name: input.businessName },
        publisher: {
          "@type": "Organization",
          name: input.settings.business_name || input.businessName,
        },
      };
    case "FAQPage":
      return (
        buildFaqSchema([]) ?? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [],
        }
      );
    case "BreadcrumbList":
      return buildBreadcrumbSchema([{ name: "Home", url: input.websiteUrl }]);
    case "Product":
      return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Product name",
        offers: { "@type": "Offer", priceCurrency: "ZAR", price: "0" },
      };
    case "HowTo":
      return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "How to",
        step: [{ "@type": "HowToStep", text: "Step 1" }],
      };
    default:
      return {
        "@context": "https://schema.org",
        "@type": type === "Custom" ? "Thing" : type,
        name: input.settings.business_name || input.businessName,
      };
  }
}

export async function saveSchemaRecord(input: {
  projectId: string;
  companyId: string;
  pageId?: string | null;
  schemaType: string;
  jsonLd: Record<string, unknown>;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const validation = validateJsonLd(input.jsonLd);
  const { data, error } = await admin.client
    .from("seo_schema")
    .insert({
      project_id: input.projectId,
      company_id: input.companyId,
      page_id: input.pageId ?? null,
      schema_type: input.schemaType,
      json_ld: input.jsonLd,
      is_valid: validation.isValid,
      validation_errors: validation.errors,
      is_active: validation.isValid,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Save failed" };
  return { ok: true, id: data.id };
}

export async function deleteSchemaRecord(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client.from("seo_schema").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Re-export service schema builder for convenience
export { buildServiceSchema };
