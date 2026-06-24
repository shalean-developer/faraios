import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const cleaningModule: IndustryModule = {
  slug: "cleaning",
  name: "Cleaning Services",
  description: "Residential and commercial cleaning businesses",
  icon: "sparkles",
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
          key: "property_type",
          type: "dropdown",
          label: "Property type",
          options: ["House", "Apartment", "Office", "Other"],
          section: "Property",
        },
        11
      ),
      field(
        { key: "bedrooms", type: "number", label: "Bedrooms", section: "Property" },
        12
      ),
      field(
        { key: "bathrooms", type: "number", label: "Bathrooms", section: "Property" },
        13
      ),
      field(
        {
          key: "cleaning_type",
          type: "dropdown",
          label: "Cleaning type",
          options: ["Standard", "Deep cleaning", "Move-in/out", "Once-off"],
          section: "Service details",
        },
        14
      ),
      field(
        {
          key: "frequency",
          type: "dropdown",
          label: "Frequency",
          options: ["Once-off", "Weekly", "Bi-weekly", "Monthly"],
          section: "Service details",
        },
        15
      ),
      field(
        {
          key: "access_instructions",
          type: "textarea",
          label: "Property notes & access instructions",
          section: "Location",
        },
        31
      ),
    ]),
    validationRules: [
      {
        if: { field: "cleaning_type", equals: "Deep cleaning" },
        then: { require: ["bedrooms", "bathrooms"] },
      },
    ],
  },

  services: {
    categoryPresets: [
      "Residential",
      "Commercial",
      "Deep clean",
      "Move-in / move-out",
      "Maintenance",
    ],
    templates: [
      {
        name: "Standard home clean",
        category: "Residential",
        description: "Kitchen, bathrooms, bedrooms, and living areas.",
        price: "450",
        durationMinutes: 120,
        addons: [
          { name: "Inside oven", price: "150" },
          { name: "Inside fridge", price: "100" },
        ],
      },
      {
        name: "Deep cleaning",
        category: "Deep clean",
        description: "Detailed clean including skirting, fixtures, and hard-to-reach areas.",
        price: "750",
        durationMinutes: 240,
        addons: [
          { name: "Inside cupboards", price: "200" },
          { name: "Windows (interior)", price: "150" },
        ],
      },
      {
        name: "Move-in / move-out clean",
        category: "Move-in / move-out",
        description: "Empty property clean before handover or occupation.",
        price: "950",
        durationMinutes: 300,
        addons: [{ name: "Garage clean", price: "200" }],
      },
      {
        name: "Office clean",
        category: "Commercial",
        description: "Desks, floors, kitchenette, and restrooms.",
        price: "600",
        durationMinutes: 180,
        addons: [{ name: "Carpet shampoo", price: "300" }],
      },
    ],
  },

  workflows: [
    {
      name: "Send booking confirmation",
      triggerType: "booking_created",
      steps: [{ action: "send_email", config: { template: "booking_confirmation" } }],
      enabled: false,
    },
    {
      name: "Request review after clean",
      triggerType: "booking_completed",
      steps: [{ action: "send_email", config: { template: "review_request" } }],
      enabled: false,
    },
  ],

  growth: {
    seoPageTypes: ["location", "service"],
    contentSeeds: [
      { title: "Location service pages", description: "Suburb and area landing pages", type: "location" },
    ],
    serviceLabel: "Cleaning",
    heroSubtitle:
      "Reliable cleaning with easy online booking, vetted professionals, and consistent quality.",
  },

  intelligence: {
    kpiDefinitions: [
      { key: "recurring_revenue", label: "Recurring cleaning revenue" },
      { key: "avg_booking_value", label: "Average booking value" },
    ],
    reportTemplates: [
      { key: "recurring_clients", label: "Recurring clients", description: "Weekly and monthly clients" },
    ],
    aiPromptContext:
      "This is a cleaning services business. Focus on recurring bookings, property types, deep cleans, and cleaner assignment.",
  },

  terminology: {
    booking: "Booking",
    service: "Cleaning service",
    staff: "Cleaner",
    customer: "Customer",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for cleaning businesses",
      description: "Import starter cleaning services with typical pricing and add-ons.",
    },
  },
};
