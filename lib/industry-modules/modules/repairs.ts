import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

const V8_SETUP = [
  "Import default repair services",
  "Complete business profile and service areas",
  "Publish your booking page",
  "Connect payments",
  "Add your first customer or job",
];

export const repairsModule: IndustryModule = {
  slug: "repairs",
  name: "Repairs",
  description: "Appliance, furniture, and general repair services",
  icon: "wrench",
  version: "2.0.0",

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
          key: "repair_type",
          type: "dropdown",
          label: "Repair type",
          options: ["Appliance", "Furniture", "General", "Door", "Window", "Emergency", "Other"],
          section: "Repair details",
        },
        11
      ),
      field(
        {
          key: "problem_description",
          type: "textarea",
          label: "Item / problem description",
          required: true,
          section: "Repair details",
        },
        12
      ),
      field(
        {
          key: "urgency",
          type: "dropdown",
          label: "Urgency",
          options: ["Low", "Normal", "Urgent", "Emergency"],
          section: "Repair details",
        },
        13
      ),
      field(
        {
          key: "photos",
          type: "file",
          label: "Photos",
          section: "Repair details",
        },
        14
      ),
      field(
        {
          key: "site_notes",
          type: "textarea",
          label: "Address notes",
          section: "Location",
        },
        32
      ),
    ]),
  },

  services: {
    categoryPresets: ["Appliance", "Furniture", "General", "Emergency"],
    templates: [
      {
        name: "Appliance Repair",
        category: "Appliance",
        description: "Diagnosis and repair for household appliances.",
        price: "500",
        durationMinutes: 90,
        addons: [{ name: "Parts supply", price: "200" }],
      },
      {
        name: "Furniture Repair",
        category: "Furniture",
        description: "Restore and repair furniture items.",
        price: "450",
        durationMinutes: 120,
        addons: [],
      },
      {
        name: "General Maintenance",
        category: "General",
        description: "General property maintenance and minor fixes.",
        price: "500",
        durationMinutes: 120,
        addons: [],
      },
      {
        name: "Door Repair",
        category: "General",
        description: "Door alignment, hinges, and lock repairs.",
        price: "400",
        durationMinutes: 60,
        addons: [],
      },
      {
        name: "Window Repair",
        category: "General",
        description: "Window frame, glass, and seal repairs.",
        price: "450",
        durationMinutes: 90,
        addons: [],
      },
      {
        name: "Emergency Repair",
        category: "Emergency",
        description: "Same-day emergency repair call-out.",
        price: "750",
        durationMinutes: 120,
        addons: [{ name: "After-hours surcharge", price: "250" }],
      },
    ],
  },

  customers: {
    extraFieldKeys: ["property_type", "preferred_contact"],
  },

  growth: {
    seoPageTypes: ["location", "service"],
    serviceLabel: "Repairs",
    heroSubtitle: "Reliable repair technicians for homes and businesses.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "jobs_completed", label: "Jobs completed" }],
    reportTemplates: [{ key: "jobs_by_type", label: "Jobs by repair type" }],
    aiPromptContext: "This is a repair business. Focus on job urgency, call-out fees, and technician scheduling.",
  },

  terminology: {
    booking: "Jobs",
    service: "Repair Services",
    staff: "Technicians",
    customer: "Customers",
  },

  pricingExamples: [
    { label: "Callout Fee", fromPrice: "R350" },
    { label: "General Repair", fromPrice: "R500" },
    { label: "Emergency Repair", fromPrice: "R750" },
  ],

  teamRoles: ["Technician", "Senior Technician", "Apprentice", "Dispatcher"],

  setupChecklist: V8_SETUP,

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for repair businesses",
      description: "Import common repair services and pricing.",
    },
  },
};
