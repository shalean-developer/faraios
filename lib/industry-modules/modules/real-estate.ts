import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const realEstateModule: IndustryModule = {
  slug: "real-estate",
  name: "Real Estate",
  description: "Property services, agencies, and management",
  icon: "home",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Contact", "FAQ"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder([
      ...STANDARD_CUSTOMER_FIELDS,
      field(
        {
          key: "property_type",
          type: "dropdown",
          label: "Property type",
          options: ["Residential", "Commercial", "Industrial", "Land"],
          section: "Property",
        },
        11
      ),
      field(
        {
          key: "inquiry_type",
          type: "dropdown",
          label: "Inquiry type",
          options: ["Viewing", "Valuation", "Rental", "Sale", "Management"],
          section: "Inquiry",
        },
        12
      ),
      field(
        {
          key: "budget_range",
          type: "text",
          label: "Budget range",
          section: "Inquiry",
        },
        13
      ),
      field(
        {
          key: "property_notes",
          type: "textarea",
          label: "Property details",
          section: "Property",
        },
        14
      ),
    ]),
  },

  services: {
    categoryPresets: ["Sales", "Rentals", "Management", "Valuations"],
    templates: [
      {
        name: "Property viewing",
        category: "Sales",
        description: "Schedule a property viewing with an agent.",
        price: "0",
        durationMinutes: 45,
        addons: [],
      },
      {
        name: "Property valuation",
        category: "Valuations",
        description: "Professional property valuation report.",
        price: "1500",
        durationMinutes: 90,
        addons: [],
      },
      {
        name: "Rental management",
        category: "Management",
        description: "Monthly property management fee.",
        price: "1200",
        durationMinutes: 60,
        addons: [],
      },
    ],
  },

  growth: {
    seoPageTypes: ["location", "service"],
    serviceLabel: "Real Estate",
    heroSubtitle: "Expert property services with personalized guidance and local market knowledge.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "viewings_booked", label: "Viewings booked" }],
    reportTemplates: [{ key: "inquiries_by_type", label: "Inquiries by type" }],
    aiPromptContext: "This is a real estate business. Focus on viewings, valuations, and property inquiries.",
  },

  terminology: {
    booking: "Appointment",
    service: "Property service",
    staff: "Agent",
    customer: "Client",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for real estate businesses",
      description: "Import common property services.",
    },
  },
};
