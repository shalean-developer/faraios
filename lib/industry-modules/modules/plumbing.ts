import type { IndustryModule } from "../types";
import { withSortOrder } from "../shared/field-builders";
import { tradeBookingFields } from "../shared/trade-fields";

export const plumbingModule: IndustryModule = {
  slug: "plumbing",
  name: "Plumbing",
  description: "Plumbing repairs, installations, and maintenance",
  icon: "wrench",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Contact", "FAQ"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder(tradeBookingFields("Service type")),
  },

  services: {
    categoryPresets: ["Repair", "Installation", "Emergency", "Maintenance"],
    templates: [
      {
        name: "Leak repair",
        category: "Repair",
        description: "Diagnosis and repair for pipes and fittings.",
        price: "450",
        durationMinutes: 90,
        addons: [{ name: "After-hours call-out", price: "250" }],
      },
      {
        name: "Drain clearing",
        category: "Repair",
        description: "Blocked drains cleared with professional equipment.",
        price: "550",
        durationMinutes: 60,
        addons: [],
      },
      {
        name: "Geyser installation",
        category: "Installation",
        description: "Supply and install a new geyser.",
        price: "4500",
        durationMinutes: 240,
        addons: [{ name: "Disposal of old unit", price: "300" }],
      },
      {
        name: "Emergency call-out",
        category: "Emergency",
        description: "Same-day response for urgent plumbing issues.",
        price: "750",
        durationMinutes: 120,
        addons: [],
      },
    ],
  },

  growth: {
    seoPageTypes: ["location", "service"],
    serviceLabel: "Plumbing",
    heroSubtitle: "Fast-response plumbers for repairs, installations, and maintenance.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "emergency_jobs", label: "Emergency jobs completed" }],
    reportTemplates: [{ key: "jobs_by_type", label: "Jobs by service type" }],
    aiPromptContext: "This is a plumbing business. Focus on emergency response, repairs, and installations.",
  },

  terminology: {
    booking: "Service call",
    service: "Plumbing service",
    staff: "Plumber",
    customer: "Customer",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for plumbing businesses",
      description: "Import common plumbing services and pricing.",
    },
  },
};
