import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const consultingModule: IndustryModule = {
  slug: "consulting",
  name: "Consulting",
  description: "Professional consulting and advisory services",
  icon: "briefcase",
  version: "2.0.0",

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
          key: "business_challenge",
          type: "textarea",
          label: "Business challenge",
          required: true,
          section: "Consultation",
        },
        13
      ),
      field(
        {
          key: "session_format",
          type: "dropdown",
          label: "Session format",
          options: ["In person", "Video call", "Phone", "On-site"],
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
        name: "Strategy Session",
        category: "Strategy",
        description: "Half-day strategy workshop.",
        price: "750",
        durationMinutes: 240,
        addons: [],
      },
      {
        name: "Business Consultation",
        category: "Consulting",
        description: "Comprehensive business advisory session.",
        price: "1000",
        durationMinutes: 120,
        addons: [],
      },
      {
        name: "Financial Consultation",
        category: "Consulting",
        description: "Financial planning and review session.",
        price: "1000",
        durationMinutes: 90,
        addons: [],
      },
      {
        name: "Marketing Consultation",
        category: "Consulting",
        description: "Marketing strategy and channel review.",
        price: "850",
        durationMinutes: 90,
        addons: [],
      },
      {
        name: "HR Consultation",
        category: "Consulting",
        description: "HR policy and people operations advisory.",
        price: "850",
        durationMinutes: 90,
        addons: [],
      },
      {
        name: "Implementation Support",
        category: "Retainer",
        description: "Ongoing implementation and advisory support.",
        price: "2500",
        durationMinutes: 480,
        addons: [],
      },
    ],
  },

  customers: {
    extraFieldKeys: ["company_name", "consultation_type", "budget_range"],
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
    booking: "Sessions",
    service: "Consulting Services",
    staff: "Consultant",
    customer: "Clients",
    revenue: "Proposals",
  },

  pricingExamples: [
    { label: "Strategy Session", fromPrice: "R750" },
    { label: "Business Consultation", fromPrice: "R1,000" },
    { label: "Implementation Support", fromPrice: "R2,500" },
  ],

  teamRoles: ["Consultant", "Senior Consultant", "Analyst", "Partner"],

  setupChecklist: [
    "Import default consulting services",
    "Set session types and rates",
    "Publish your booking page",
    "Connect payments",
    "Add your first client session",
  ],

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for consulting businesses",
      description: "Import common consulting services.",
    },
  },
};
