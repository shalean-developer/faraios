import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const cleaningModule: IndustryModule = {
  slug: "cleaning",
  name: "Cleaning Services",
  description: "Residential and commercial cleaning businesses",
  icon: "sparkles",
  version: "2.0.0",

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
          key: "extras",
          type: "multiselect",
          label: "Extras",
          options: ["Inside oven", "Inside fridge", "Windows", "Laundry", "Inside cupboards"],
          section: "Service details",
        },
        16
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
        name: "Regular Cleaning",
        category: "Residential",
        description: "Standard home clean for kitchens, bathrooms, and living areas.",
        price: "350",
        durationMinutes: 120,
        addons: [
          { name: "Inside oven", price: "150" },
          { name: "Inside fridge", price: "100" },
        ],
      },
      {
        name: "Deep Cleaning",
        category: "Deep clean",
        description: "Detailed clean including skirting, fixtures, and hard-to-reach areas.",
        price: "650",
        durationMinutes: 240,
        addons: [
          { name: "Inside cupboards", price: "200" },
          { name: "Windows (interior)", price: "150" },
        ],
      },
      {
        name: "Move-In / Move-Out Cleaning",
        category: "Move-in / move-out",
        description: "Empty property clean before handover or occupation.",
        price: "950",
        durationMinutes: 300,
        addons: [{ name: "Garage clean", price: "200" }],
      },
      {
        name: "Office Cleaning",
        category: "Commercial",
        description: "Desks, floors, kitchenette, and restrooms.",
        price: "500",
        durationMinutes: 180,
        addons: [{ name: "Carpet shampoo", price: "300" }],
      },
      {
        name: "Airbnb Cleaning",
        category: "Commercial",
        description: "Turnover clean for short-term rental properties.",
        price: "450",
        durationMinutes: 150,
        addons: [{ name: "Linen change", price: "100" }],
      },
      {
        name: "Carpet Cleaning",
        category: "Maintenance",
        description: "Professional carpet shampoo and stain treatment.",
        price: "400",
        durationMinutes: 120,
        addons: [],
      },
    ],
  },

  customers: {
    extraFieldKeys: ["property_type", "frequency", "access_instructions"],
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
    booking: "Bookings",
    service: "Services",
    staff: "Cleaners",
    customer: "Customers",
  },

  pricingExamples: [
    { label: "Regular Cleaning", fromPrice: "R350" },
    { label: "Deep Cleaning", fromPrice: "R650" },
    { label: "Office Cleaning", fromPrice: "R500" },
  ],

  teamRoles: ["Cleaner", "Team Lead", "Supervisor"],

  setupChecklist: [
    "Import default cleaning services",
    "Set your service areas and pricing",
    "Publish your booking page",
    "Connect payments",
    "Add your first customer or booking",
  ],

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for cleaning businesses",
      description: "Import starter cleaning services with typical pricing and add-ons.",
    },
  },
};
