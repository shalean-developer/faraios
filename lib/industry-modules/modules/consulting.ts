import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const consultingModule: IndustryModule = {
  slug: "consulting",
  name: "Consulting",
  description: "Professional consulting and advisory services",
  icon: "briefcase",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "About", "Services", "Contact"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder([
      ...STANDARD_CUSTOMER_FIELDS,
      field(
        {
          key: "consultation_type",
          type: "dropdown",
          label: "Consultation type",
          options: ["Discovery call", "Strategy session", "Audit", "Workshop", "Retainer"],
          section: "Consultation",
        },
        11
      ),
      field(
        {
          key: "company_name",
          type: "text",
          label: "Company name",
          section: "Contact",
        },
        12
      ),
      field(
        {
          key: "project_scope",
          type: "textarea",
          label: "Project scope",
          section: "Consultation",
        },
        13
      ),
      field(
        {
          key: "budget_range",
          type: "text",
          label: "Budget range",
          section: "Consultation",
        },
        14
      ),
    ]),
  },

  services: {
    categoryPresets: ["Consulting", "Strategy", "Audit", "Workshops", "Retainer"],
    templates: [
      {
        name: "Discovery call",
        category: "Consulting",
        description: "30-minute introductory consultation.",
        price: "0",
        durationMinutes: 30,
        addons: [],
      },
      {
        name: "Strategy session",
        category: "Strategy",
        description: "Half-day strategy workshop.",
        price: "4500",
        durationMinutes: 240,
        addons: [],
      },
      {
        name: "Business audit",
        category: "Audit",
        description: "Comprehensive business review and recommendations.",
        price: "8500",
        durationMinutes: 480,
        addons: [],
      },
      {
        name: "Monthly retainer",
        category: "Retainer",
        description: "Ongoing advisory support.",
        price: "6500",
        durationMinutes: 120,
        addons: [],
      },
    ],
  },

  growth: {
    seoPageTypes: ["service", "project"],
    serviceLabel: "Consulting",
    heroSubtitle: "Expert advisory services tailored to your business goals.",
  },

  intelligence: {
    kpiDefinitions: [
      { key: "consultation_conversion", label: "Consultation to project conversion" },
    ],
    reportTemplates: [{ key: "consultations_by_type", label: "Consultations by type" }],
    aiPromptContext: "This is a consulting business. Focus on discovery calls, project scope, and retainer clients.",
  },

  terminology: {
    booking: "Consultation",
    service: "Service",
    staff: "Consultant",
    customer: "Client",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for consulting businesses",
      description: "Import common consulting services.",
    },
  },
};
