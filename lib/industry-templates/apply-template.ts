import { seedPublishedBookingFormForCompany } from "@/lib/services/booking-forms";
import { findServiceByName, getNextServiceSortOrder } from "@/lib/services/company-services";
import { parsePriceToCents } from "@/lib/operations/metrics";
import { loadIndustryModule } from "@/lib/industry-modules/loader";
import { applyIndustryModulePreset } from "@/lib/industry-modules/seeding";
import { normalizeIndustrySlug } from "@/lib/industry-modules/registry";
import { serializeIndustryTemplateForDb } from "@/lib/industry-templates/industryTemplates";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ServiceAddon } from "@/types/booking-form";
import type { ServiceTemplate } from "@/lib/industry-modules/types";

export type ApplyIndustryTemplateInput = {
  companyId: string;
  industryId: string;
  industrySlug: string;
  businessName: string;
  /** When true, replace template-flagged services; never deletes user-created services. */
  overwriteTemplateServices?: boolean;
  /** When true, reset booking form to industry preset. */
  resetBookingForm?: boolean;
};

export type ApplyIndustryTemplateResult =
  | {
      ok: true;
      servicesCreated: number;
      servicesSkipped: number;
      industryName: string;
    }
  | { ok: false; error: string };

function templatesToRows(
  companyId: string,
  industryKey: string,
  templates: ServiceTemplate[],
  startOrder: number
) {
  return templates.map((template, index) => ({
    company_id: companyId,
    name: template.name,
    category: template.category,
    description: template.description,
    base_price_cents: parsePriceToCents(template.price) ?? 0,
    duration_minutes: template.durationMinutes,
    active: true,
    industry_key: industryKey,
    is_template_service: true,
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

async function seedTemplateServices(input: {
  companyId: string;
  industrySlug: string;
  overwriteTemplateServices: boolean;
}): Promise<{ created: number; skipped: number }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { created: 0, skipped: 0 };

  const industryKey = normalizeIndustrySlug(input.industrySlug);
  const templates = loadIndustryModule(industryKey).services.templates;

  if (input.overwriteTemplateServices) {
    await admin.client
      .from("company_services")
      .delete()
      .eq("company_id", input.companyId)
      .eq("is_template_service", true);
  }

  let created = 0;
  let skipped = 0;
  let sortOrder = await getNextServiceSortOrder(input.companyId);

  for (const template of templates) {
    const existing = await findServiceByName(input.companyId, template.name);
    if (existing) {
      skipped += 1;
      continue;
    }

    const [row] = templatesToRows(input.companyId, industryKey, [template], sortOrder);
    const { error } = await admin.client.from("company_services").insert(row);
    if (!error) {
      created += 1;
      sortOrder += 1;
    }
  }

  return { created, skipped };
}

export async function applyIndustryTemplate(
  input: ApplyIndustryTemplateInput
): Promise<ApplyIndustryTemplateResult> {
  const industryKey = normalizeIndustrySlug(input.industrySlug);
  const industryModule = loadIndustryModule(industryKey);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to apply an industry template." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("onboarding_data")
    .eq("id", input.companyId)
    .maybeSingle();

  const onboardingData =
    company?.onboarding_data && typeof company.onboarding_data === "object"
      ? (company.onboarding_data as Record<string, unknown>)
      : {};

  const templatePayload = serializeIndustryTemplateForDb(industryKey);
  const now = new Date().toISOString();

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      industry_id: input.industryId,
      industry_template_applied: true,
      industry_template_key: industryKey,
      template_applied_at: now,
      onboarding_data: {
        ...onboardingData,
        module_slug: industryModule.slug,
        module_version: industryModule.version,
        industry_template: templatePayload,
      },
      business_description: industryModule.growth.heroSubtitle,
    })
    .eq("id", input.companyId);

  if (companyError) {
    return { ok: false, error: companyError.message };
  }

  const { created, skipped } = await seedTemplateServices({
    companyId: input.companyId,
    industrySlug: industryKey,
    overwriteTemplateServices: input.overwriteTemplateServices ?? false,
  });

  await applyIndustryModulePreset({
    companyId: input.companyId,
    industrySlug: industryKey,
    businessName: input.businessName,
  });

  if (input.resetBookingForm !== false) {
    await seedPublishedBookingFormForCompany({
      companyId: input.companyId,
      industrySlug: industryKey,
      force: true,
    });
  }

  const admin = tryCreateAdminClient();
  if (admin.ok) {
    await admin.client.from("industry_templates").upsert(
      {
        industry_key: industryKey,
        industry_name: industryModule.name,
        description: industryModule.description,
        template_data: templatePayload,
        active: true,
        updated_at: now,
      },
      { onConflict: "industry_key" }
    );
  }

  return {
    ok: true,
    servicesCreated: created,
    servicesSkipped: skipped,
    industryName: industryModule.name,
  };
}
