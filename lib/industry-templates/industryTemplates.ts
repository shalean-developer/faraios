import { loadIndustryModule } from "@/lib/industry-modules/loader";
import {
  V8_INDUSTRY_TEMPLATE_KEYS,
  type V8IndustryTemplateKey,
} from "@/lib/industry-modules/registry";
import type {
  IndustryModule,
  IndustryTemplateData,
  IndustryTerminology,
} from "@/lib/industry-modules/types";

export { V8_INDUSTRY_TEMPLATE_KEYS, type V8IndustryTemplateKey };

export function isV8IndustryKey(slug: string | null | undefined): slug is V8IndustryTemplateKey {
  return V8_INDUSTRY_TEMPLATE_KEYS.includes(slug as V8IndustryTemplateKey);
}

export function moduleToTemplateData(module: IndustryModule): IndustryTemplateData {
  return {
    industryKey: module.slug,
    industryName: module.name,
    description: module.description,
    defaultServices: module.services.templates,
    dashboardLabels: module.terminology,
    bookingFields: module.booking.formPreset,
    pricingExamples: module.pricingExamples ?? [],
    customerFields: module.customers?.extraFieldKeys ?? [],
    teamRoles: module.teamRoles ?? [],
    setupChecklist: module.setupChecklist ?? [],
  };
}

export function getIndustryTemplate(
  slug: string | null | undefined
): IndustryTemplateData {
  return moduleToTemplateData(loadIndustryModule(slug));
}

export function listIndustryTemplates(): IndustryTemplateData[] {
  return V8_INDUSTRY_TEMPLATE_KEYS.map((key) => getIndustryTemplate(key));
}

export function serializeIndustryTemplateForDb(
  slug: string | null | undefined
): Record<string, unknown> {
  const data = getIndustryTemplate(slug);
  return {
    industry_key: data.industryKey,
    industry_name: data.industryName,
    description: data.description,
    default_services: data.defaultServices,
    dashboard_labels: data.dashboardLabels,
    booking_fields: data.bookingFields,
    pricing_examples: data.pricingExamples,
    customer_fields: data.customerFields,
    team_roles: data.teamRoles,
    setup_checklist: data.setupChecklist,
  };
}

export type IndustryNavLabels = {
  bookings: string;
  calendar: string;
  customers: string;
  services: string;
  team: string;
  revenue: string;
};

const DEFAULT_NAV_LABELS: IndustryNavLabels = {
  bookings: "Bookings",
  calendar: "Calendar",
  customers: "Customers",
  services: "Services",
  team: "Team",
  revenue: "Revenue",
};

export function getIndustryNavLabels(
  slug: string | null | undefined
): IndustryNavLabels {
  const t: IndustryTerminology = loadIndustryModule(slug).terminology;
  return {
    bookings: t.booking ?? DEFAULT_NAV_LABELS.bookings,
    calendar: t.calendar ?? DEFAULT_NAV_LABELS.calendar,
    customers: t.customer ?? DEFAULT_NAV_LABELS.customers,
    services: t.service ?? DEFAULT_NAV_LABELS.services,
    team: t.staff ? `${t.staff}` : DEFAULT_NAV_LABELS.team,
    revenue: t.revenue ?? DEFAULT_NAV_LABELS.revenue,
  };
}
