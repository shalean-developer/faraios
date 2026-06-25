import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const plumbingModule: IndustryModule = {
  slug: "plumbing",
  name: "Plumbing",
  description: "Plumbing repairs, installations, and maintenance",
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
          key: "plumbing_issue",
          type: "dropdown",
          label: "Plumbing issue",
          options: ["Leak", "Blocked drain", "Geyser", "Pipe replacement", "Bathroom", "Emergency", "Other"],
          section: "Service details",
        },
        11
      ),
      field(
        {
          key: "problem_description",
          type: "textarea",
          label: "Problem description",
          required: true,
          section: "Service details",
        },
        12
      ),
      field(
        {
          key: "urgency",
          type: "dropdown",
          label: "Urgency",
          options: ["Low", "Normal", "Urgent", "Emergency"],
          section: "Service details",
        },
        13
      ),
      field(
        {
          key: "property_type",
          type: "dropdown",
          label: "Property type",
          options: ["House", "Apartment", "Commercial", "Other"],
          section: "Property",
        },
        14
      ),
      field(
        {
          key: "photos",
          type: "file",
          label: "Photos",
          section: "Service details",
        },
        15
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
    categoryPresets: ["Repair", "Installation", "Emergency", "Maintenance"],
    templates: [
      {
        name: "Leak Repair",
        category: "Repair",
        description: "Diagnosis and repair for pipes and fittings.",
        price: "450",
        durationMinutes: 90,
        addons: [{ name: "After-hours call-out", price: "250" }],
      },
      {
        name: "Drain Unblocking",
        category: "Repair",
        description: "Blocked drains cleared with professional equipment.",
        price: "650",
        durationMinutes: 60,
        addons: [],
      },
      {
        name: "Geyser Installation",
        category: "Installation",
        description: "Supply and install a new geyser.",
        price: "4500",
        durationMinutes: 240,
        addons: [{ name: "Disposal of old unit", price: "300" }],
      },
      {
        name: "Pipe Replacement",
        category: "Repair",
        description: "Replace damaged or corroded pipe sections.",
        price: "1200",
        durationMinutes: 180,
        addons: [],
      },
      {
        name: "Bathroom Plumbing",
        category: "Installation",
        description: "Bathroom fixture installation and plumbing.",
        price: "1500",
        durationMinutes: 240,
        addons: [],
      },
      {
        name: "Emergency Plumbing",
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
    booking: "Jobs",
    service: "Plumbing Services",
    staff: "Plumbers",
    customer: "Customers",
  },

  pricingExamples: [
    { label: "Callout Fee", fromPrice: "R450" },
    { label: "Drain Unblocking", fromPrice: "R650" },
    { label: "Geyser Installation", fromPrice: "R1,500" },
  ],

  teamRoles: ["Plumber", "Apprentice", "Dispatcher"],

  setupChecklist: [
    "Import default plumbing services",
    "Set service areas and call-out fees",
    "Publish your booking page",
    "Connect payments",
    "Add your first job",
  ],

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for plumbing businesses",
      description: "Import common plumbing services and pricing.",
    },
  },
};
