import type { IndustryModule } from "../types";
import { withSortOrder } from "../shared/field-builders";
import { tradeBookingFields } from "../shared/trade-fields";

export const securityModule: IndustryModule = {
  slug: "security",
  name: "Security Services",
  description: "Security systems, monitoring, and guarding",
  icon: "shield",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Contact", "FAQ"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder(tradeBookingFields("Security service type")),
  },

  services: {
    categoryPresets: ["Installation", "Monitoring", "Patrol", "Consultation"],
    templates: [
      {
        name: "Alarm system installation",
        category: "Installation",
        description: "Supply and install alarm system with sensors.",
        price: "8500",
        durationMinutes: 360,
        addons: [{ name: "CCTV add-on", price: "4500" }],
      },
      {
        name: "CCTV installation",
        category: "Installation",
        description: "Camera system design and installation.",
        price: "6500",
        durationMinutes: 300,
        addons: [{ name: "Remote viewing setup", price: "500" }],
      },
      {
        name: "Security assessment",
        category: "Consultation",
        description: "On-site security risk assessment.",
        price: "750",
        durationMinutes: 90,
        addons: [],
      },
      {
        name: "Monthly monitoring",
        category: "Monitoring",
        description: "24/7 alarm monitoring subscription.",
        price: "350",
        durationMinutes: 30,
        addons: [],
      },
    ],
  },

  growth: {
    seoPageTypes: ["service", "location"],
    serviceLabel: "Security",
    heroSubtitle: "Professional security solutions for homes and businesses.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "installations", label: "Installations completed" }],
    reportTemplates: [{ key: "services_by_type", label: "Services by type" }],
    aiPromptContext: "This is a security services business. Focus on installations, monitoring contracts, and assessments.",
  },

  terminology: {
    booking: "Service request",
    service: "Security service",
    staff: "Technician",
    customer: "Client",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for security businesses",
      description: "Import common security services.",
    },
  },
};
