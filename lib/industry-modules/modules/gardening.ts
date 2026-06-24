import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const gardeningModule: IndustryModule = {
  slug: "gardening",
  name: "Gardening & Landscaping",
  description: "Garden maintenance, landscaping, and outdoor services",
  icon: "leaf",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Contact", "FAQ"],
    defaultFeatures: ["booking"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder([
      ...STANDARD_CUSTOMER_FIELDS,
      field(
        {
          key: "garden_size",
          type: "dropdown",
          label: "Garden size",
          options: ["Small", "Medium", "Large"],
          section: "Garden",
        },
        11
      ),
      field(
        {
          key: "service_type",
          type: "dropdown",
          label: "Service type",
          options: ["Maintenance", "Landscaping", "Cleanup", "Irrigation"],
          section: "Garden",
        },
        12
      ),
      field(
        {
          key: "waste_removal",
          type: "checkbox",
          label: "Waste removal needed",
          section: "Garden",
        },
        13
      ),
    ]),
  },

  services: {
    categoryPresets: ["Maintenance", "Landscaping", "Cleanup", "Irrigation"],
    templates: [
      {
        name: "Garden maintenance",
        category: "Maintenance",
        description: "Regular mowing, trimming, and tidying.",
        price: "450",
        durationMinutes: 120,
        addons: [{ name: "Hedge trimming", price: "150" }],
      },
      {
        name: "Landscaping design",
        category: "Landscaping",
        description: "Garden design and planting.",
        price: "3500",
        durationMinutes: 480,
        addons: [{ name: "Irrigation install", price: "2500" }],
      },
      {
        name: "Garden cleanup",
        category: "Cleanup",
        description: "Overgrown garden clearance and disposal.",
        price: "850",
        durationMinutes: 240,
        addons: [{ name: "Waste removal", price: "300" }],
      },
    ],
  },

  growth: {
    seoPageTypes: ["location", "service"],
    serviceLabel: "Gardening",
    heroSubtitle: "Professional garden care and landscaping with reliable scheduling.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "recurring_maintenance", label: "Recurring maintenance clients" }],
    reportTemplates: [{ key: "services_by_garden_size", label: "Jobs by garden size" }],
    aiPromptContext: "This is a gardening and landscaping business. Focus on maintenance schedules and garden sizes.",
  },

  terminology: {
    booking: "Booking",
    service: "Garden service",
    staff: "Gardener",
    customer: "Customer",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for gardening businesses",
      description: "Import common gardening and landscaping services.",
    },
  },
};
