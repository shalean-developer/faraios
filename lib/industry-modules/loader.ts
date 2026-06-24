import type { BookingFormField } from "@/types/booking-form";
import type { CompanyWithIndustry } from "@/types/database";

import {
  INDUSTRY_MODULES,
  listRegisteredIndustrySlugs,
  normalizeIndustrySlug,
} from "./registry";
import type { IndustryModule, ServiceTemplate } from "./types";

export function loadIndustryModule(slug: string | null | undefined): IndustryModule {
  return getIndustryModule(slug);
}

export function getIndustryModule(slug: string | null | undefined): IndustryModule {
  const normalized = normalizeIndustrySlug(slug);
  return INDUSTRY_MODULES[normalized] ?? INDUSTRY_MODULES.default;
}

export function getModuleForCompany(company: CompanyWithIndustry): IndustryModule {
  const slug = company.industries?.slug ?? null;
  return loadIndustryModule(slug);
}

export function getBookingFormPreset(slug: string | null | undefined): BookingFormField[] {
  const module = loadIndustryModule(slug);
  return module.booking.formPreset.map((field, index) => ({
    ...field,
    sortOrder: field.sortOrder ?? index,
  }));
}

export function getServiceTemplates(slug: string | null | undefined): ServiceTemplate[] {
  return loadIndustryModule(slug).services.templates;
}

export function getServiceCategoryPresets(slug: string | null | undefined): string[] {
  return loadIndustryModule(slug).services.categoryPresets;
}

export function getOnboardingDefaults(slug: string | null | undefined): {
  pages: string[];
  featureSlugs: string[];
} {
  const module = loadIndustryModule(slug);
  return {
    pages: [...module.onboarding.defaultPages],
    featureSlugs: [...module.onboarding.defaultFeatures],
  };
}

export function listIndustryModuleSlugs(): string[] {
  return listRegisteredIndustrySlugs();
}

/** @deprecated Use listIndustryModuleSlugs */
export const INDUSTRY_PRESET_SLUGS = listIndustryModuleSlugs();

/** @deprecated Use getBookingFormPreset */
export function getIndustryBookingPreset(industrySlug: string | null): BookingFormField[] {
  return getBookingFormPreset(industrySlug);
}

export function mergeBookingFormFields(
  base: BookingFormField[],
  overrides: BookingFormField[]
): BookingFormField[] {
  const map = new Map(base.map((f) => [f.key, f]));
  for (const field of overrides) {
    map.set(field.key, { ...map.get(field.key), ...field, key: field.key });
  }
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}
