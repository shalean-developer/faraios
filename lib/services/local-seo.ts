import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { LocalSeoSettings } from "@/types/growth-engine";

export type LocalSeoInput = Partial<
  Omit<LocalSeoSettings, "company_id" | "created_at" | "updated_at">
>;

function mapRow(row: Record<string, unknown>): LocalSeoSettings {
  return {
    company_id: row.company_id as string,
    business_name: (row.business_name as string) ?? null,
    industry: (row.industry as string) ?? null,
    main_service: (row.main_service as string) ?? null,
    primary_location: (row.primary_location as string) ?? null,
    service_areas: (row.service_areas as string[]) ?? [],
    phone: (row.phone as string) ?? null,
    email: (row.email as string) ?? null,
    address: (row.address as string) ?? null,
    opening_hours: (row.opening_hours as Record<string, unknown>) ?? {},
    google_business_profile_url: (row.google_business_profile_url as string) ?? null,
    google_review_link: (row.google_review_link as string) ?? null,
    business_categories: (row.business_categories as string[]) ?? [],
    social_links: (row.social_links as Record<string, string>) ?? {},
    auto_review_request_enabled: Boolean(row.auto_review_request_enabled),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function getLocalSeoSettings(
  companyId: string
): Promise<LocalSeoSettings | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data, error } = await admin.client
    .from("local_seo_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[local_seo_settings] getLocalSeoSettings", error.message);
    return null;
  }

  return data ? mapRow(data) : null;
}

export async function getLocalSeoSettingsAdmin(
  companyId: string
): Promise<LocalSeoSettings | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("local_seo_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  return data ? mapRow(data) : null;
}

export async function upsertLocalSeoSettings(
  companyId: string,
  input: LocalSeoInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const payload = {
    company_id: companyId,
    ...input,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.client
    .from("local_seo_settings")
    .upsert(payload, { onConflict: "company_id" });

  if (error) {
    console.error("[local_seo_settings] upsertLocalSeoSettings", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function seedLocalSeoFromCompany(
  companyId: string,
  company: {
    name: string;
    contact_phone?: string | null;
    primary_contact_email?: string | null;
    contact_location?: string | null;
    service_areas?: string | null;
    business_description?: string | null;
  }
): Promise<void> {
  const existing = await getLocalSeoSettingsAdmin(companyId);
  if (existing) return;

  const areas = company.service_areas
    ? company.service_areas.split(/[,;]/).map((a) => a.trim()).filter(Boolean)
    : [];

  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  await admin.client.from("local_seo_settings").insert({
    company_id: companyId,
    business_name: company.name,
    phone: company.contact_phone ?? null,
    email: company.primary_contact_email ?? null,
    primary_location: company.contact_location ?? null,
    service_areas: areas,
    main_service: company.business_description?.slice(0, 120) ?? null,
  });
}
