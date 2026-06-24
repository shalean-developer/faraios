import type { IndustryModule } from "../types";
import { withSortOrder } from "../shared/field-builders";
import { tradeBookingFields } from "../shared/trade-fields";

export const electricalModule: IndustryModule = {
  slug: "electrical",
  name: "Electrical Services",
  description: "Electrical installation, repair, and inspection",
  icon: "zap",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Contact", "FAQ"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder(tradeBookingFields("Service category")),
  },

  services: {
    categoryPresets: ["Repair", "Installation", "Inspection", "Emergency"],
    templates: [
      {
        name: "Fault finding & repair",
        category: "Repair",
        description: "Diagnose and fix electrical faults.",
        price: "550",
        durationMinutes: 90,
        addons: [{ name: "Parts supply", price: "200" }],
      },
      {
        name: "DB board upgrade",
        category: "Installation",
        description: "Distribution board replacement and compliance.",
        price: "6500",
        durationMinutes: 360,
        addons: [],
      },
      {
        name: "COC inspection",
        category: "Inspection",
        description: "Certificate of compliance inspection and issue.",
        price: "850",
        durationMinutes: 120,
        addons: [],
      },
      {
        name: "Emergency electrical",
        category: "Emergency",
        description: "Urgent electrical fault response.",
        price: "850",
        durationMinutes: 120,
        addons: [],
      },
    ],
  },

  growth: {
    seoPageTypes: ["location", "service"],
    serviceLabel: "Electrical",
    heroSubtitle: "Licensed electricians for safe, reliable installations and repairs.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "compliance_jobs", label: "Compliance inspections completed" }],
    reportTemplates: [{ key: "jobs_by_category", label: "Jobs by category" }],
    aiPromptContext: "This is an electrical services business. Focus on compliance, safety, and emergency call-outs.",
  },

  terminology: {
    booking: "Service call",
    service: "Electrical service",
    staff: "Electrician",
    customer: "Customer",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for electrical businesses",
      description: "Import common electrical services.",
    },
  },
};
