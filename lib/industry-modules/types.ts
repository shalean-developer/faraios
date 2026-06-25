import type { BookingFormField } from "@/types/booking-form";
import type { WorkflowStep, WorkflowTriggerType } from "@/types/v6-engine";

export type StaffAssignmentMode = "none" | "manual" | "auto-round-robin";

export type ServiceTemplate = {
  name: string;
  category: string;
  description: string;
  price: string;
  durationMinutes: number;
  addons: { name: string; price: string }[];
};

export type FieldValidationRule = {
  if: Record<string, unknown>;
  then: { require?: string[]; message?: string };
};

export type SeoPageType =
  | "location"
  | "service"
  | "treatment"
  | "destination"
  | "project";

export type ContentSeed = {
  title: string;
  description: string;
  type?: SeoPageType;
};

export type WorkflowTemplate = {
  name: string;
  triggerType: WorkflowTriggerType;
  steps: WorkflowStep[];
  enabled?: boolean;
};

export type KpiDefinition = {
  key: string;
  label: string;
  description?: string;
};

export type ReportTemplate = {
  key: string;
  label: string;
  description?: string;
};

export type IndustryTerminology = {
  booking?: string;
  service?: string;
  staff?: string;
  customer?: string;
  /** Nav label for calendar (defaults to Calendar). */
  calendar?: string;
  /** Nav label for revenue section when applicable. */
  revenue?: string;
};

export type PricingExample = {
  label: string;
  fromPrice: string;
};

export type IndustryTemplateData = {
  industryKey: string;
  industryName: string;
  description: string;
  defaultServices: ServiceTemplate[];
  dashboardLabels: IndustryTerminology;
  bookingFields: BookingFormField[];
  pricingExamples: PricingExample[];
  customerFields: string[];
  teamRoles: string[];
  setupChecklist: string[];
};

export type DashboardExtensions = {
  servicesQuickStart?: {
    title: string;
    description?: string;
  };
};

export type IndustryModule = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  version: string;

  onboarding: {
    defaultPages: string[];
    defaultFeatures: string[];
  };

  booking: {
    formPreset: BookingFormField[];
    validationRules?: FieldValidationRule[];
    staffAssignmentMode: StaffAssignmentMode;
  };

  services: {
    templates: ServiceTemplate[];
    categoryPresets: string[];
  };

  customers?: {
    extraFieldKeys?: string[];
  };

  workflows?: WorkflowTemplate[];

  growth: {
    seoPageTypes: SeoPageType[];
    contentSeeds?: ContentSeed[];
    serviceLabel: string;
    heroSubtitle: string;
  };

  intelligence: {
    kpiDefinitions: KpiDefinition[];
    reportTemplates: ReportTemplate[];
    aiPromptContext: string;
  };

  terminology: IndustryTerminology;

  pricingExamples?: PricingExample[];
  teamRoles?: string[];
  setupChecklist?: string[];

  dashboardExtensions?: DashboardExtensions;
};
