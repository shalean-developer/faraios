import { findServiceByName, getNextServiceSortOrder } from "@/lib/services/company-services";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { parsePriceToCents } from "@/lib/operations/metrics";
import type { ServiceAddon } from "@/types/booking-form";

import { loadIndustryModule } from "./loader";
import type { ServiceTemplate } from "./types";

function templatesToRows(companyId: string, templates: ServiceTemplate[], startOrder: number) {
  return templates.map((template, index) => ({
    company_id: companyId,
    name: template.name,
    category: template.category,
    description: template.description,
    base_price_cents: parsePriceToCents(template.price) ?? 0,
    duration_minutes: template.durationMinutes,
    active: true,
    addons: template.addons.map(
      (addon): ServiceAddon => ({
        id: crypto.randomUUID(),
        name: addon.name,
        price_cents: parsePriceToCents(addon.price) ?? 0,
      })
    ),
    sort_order: startOrder + index,
    updated_at: new Date().toISOString(),
  }));
}

/** Seed default services from an industry module for a new business. Skips duplicates by name. */
export async function seedDefaultServicesForCompany(input: {
  companyId: string;
  industrySlug: string | null;
}): Promise<{ ok: boolean; created: number }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, created: 0 };

  const industryModule = loadIndustryModule(input.industrySlug);
  const templates = industryModule.services.templates;
  if (templates.length === 0) return { ok: true, created: 0 };

  let created = 0;
  let sortOrder = await getNextServiceSortOrder(input.companyId);

  for (const template of templates) {
    const existing = await findServiceByName(input.companyId, template.name);
    if (existing) continue;

    const [row] = templatesToRows(input.companyId, [template], sortOrder);
    const { error } = await admin.client.from("company_services").insert(row);
    if (!error) {
      created += 1;
      sortOrder += 1;
    } else {
      console.error("[industry-seeding] seedDefaultServicesForCompany", error.message);
    }
  }

  return { ok: true, created };
}

/** Import industry service templates for an existing business (skips duplicates). */
export async function importIndustryServiceTemplates(input: {
  companyId: string;
  industrySlug: string | null;
}): Promise<{ ok: boolean; created: number; skipped: number }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, created: 0, skipped: 0 };

  const industryModule = loadIndustryModule(input.industrySlug);
  let created = 0;
  let skipped = 0;
  let sortOrder = await getNextServiceSortOrder(input.companyId);

  for (const template of industryModule.services.templates) {
    const existing = await findServiceByName(input.companyId, template.name);
    if (existing) {
      skipped += 1;
      continue;
    }

    const [row] = templatesToRows(input.companyId, [template], sortOrder);
    const { error } = await admin.client.from("company_services").insert(row);
    if (!error) {
      created += 1;
      sortOrder += 1;
    } else {
      console.error("[industry-seeding] importIndustryServiceTemplates", error.message);
    }
  }

  return { ok: true, created, skipped };
}

/** Seed optional workflow templates (disabled by default). */
export async function seedIndustryWorkflows(input: {
  companyId: string;
  industrySlug: string | null;
}): Promise<{ ok: boolean; created: number }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, created: 0 };

  const workflows = loadIndustryModule(input.industrySlug).workflows ?? [];
  if (workflows.length === 0) return { ok: true, created: 0 };

  let created = 0;

  for (const template of workflows) {
    const { data: existing } = await admin.client
      .from("workflows")
      .select("id")
      .eq("company_id", input.companyId)
      .eq("name", template.name)
      .maybeSingle();

    if (existing) continue;

    const { error } = await admin.client.from("workflows").insert({
      company_id: input.companyId,
      name: template.name,
      trigger_type: template.triggerType,
      steps: template.steps,
      enabled: template.enabled ?? false,
    });

    if (!error) created += 1;
    else console.error("[industry-seeding] seedIndustryWorkflows", error.message);
  }

  return { ok: true, created };
}

/** Store growth defaults in onboarding_data-friendly metadata (local SEO seeded separately when configured). */
export async function seedGrowthDefaultsForCompany(input: {
  companyId: string;
  industrySlug: string | null;
  businessName: string;
}): Promise<{ ok: boolean }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false };

  const industryModule = loadIndustryModule(input.industrySlug);
  const growthMeta = {
    seo_page_types: industryModule.growth.seoPageTypes,
    content_seeds: industryModule.growth.contentSeeds ?? [],
    service_label: industryModule.growth.serviceLabel,
  };

  const { data: company } = await admin.client
    .from("companies")
    .select("onboarding_data")
    .eq("id", input.companyId)
    .maybeSingle();

  const onboardingData =
    company?.onboarding_data && typeof company.onboarding_data === "object"
      ? (company.onboarding_data as Record<string, unknown>)
      : {};

  const { error } = await admin.client
    .from("companies")
    .update({
      onboarding_data: {
        ...onboardingData,
        growth_defaults: growthMeta,
        module_slug: industryModule.slug,
        module_version: industryModule.version,
      },
      business_description: industryModule.growth.heroSubtitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.companyId);

  if (error) {
    console.error("[industry-seeding] seedGrowthDefaultsForCompany", error.message);
    return { ok: false };
  }

  const { data: seoExisting } = await admin.client
    .from("local_seo_settings")
    .select("id")
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (!seoExisting) {
    await admin.client.from("local_seo_settings").insert({
      company_id: input.companyId,
      business_name: input.businessName,
      main_service: industryModule.growth.serviceLabel,
    });
  }

  return { ok: true };
}

/** Apply full industry module preset for onboarding (new businesses only). */
export async function applyIndustryModulePreset(input: {
  companyId: string;
  industrySlug: string | null;
  businessName: string;
}): Promise<void> {
  await seedDefaultServicesForCompany(input);
  await seedIndustryWorkflows(input);
  await seedGrowthDefaultsForCompany(input);
}
