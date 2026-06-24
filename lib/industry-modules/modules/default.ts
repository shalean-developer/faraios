import type { IndustryModule } from "../types";
import { withSortOrder, STANDARD_CUSTOMER_FIELDS } from "../shared/field-builders";

export const defaultModule: IndustryModule = {
  slug: "default",
  name: "General Services",
  description: "Generic service business preset",
  icon: "building",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "About", "Services", "Contact"],
    defaultFeatures: ["booking"],
  },

  booking: {
    staffAssignmentMode: "none",
    formPreset: withSortOrder(STANDARD_CUSTOMER_FIELDS),
  },

  services: {
    categoryPresets: ["General", "Consultation", "Maintenance", "Other"],
    templates: [
      {
        name: "Standard service",
        category: "General",
        description: "General on-site service appointment.",
        price: "450",
        durationMinutes: 60,
        addons: [],
      },
      {
        name: "Consultation",
        category: "Consultation",
        description: "Initial consultation to understand your needs.",
        price: "0",
        durationMinutes: 30,
        addons: [],
      },
    ],
  },

  growth: {
    seoPageTypes: ["service", "location"],
    serviceLabel: "Services",
    heroSubtitle: "Trusted professional services tailored to your needs.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "booking_volume", label: "Booking volume" }],
    reportTemplates: [{ key: "bookings_overview", label: "Bookings overview" }],
    aiPromptContext: "This is a general service business. Focus on bookings, customers, and revenue.",
  },

  terminology: {
    booking: "Booking",
    service: "Service",
    staff: "Staff",
    customer: "Customer",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start with starter services",
      description: "Import generic starter services for your catalog.",
    },
  },
};
