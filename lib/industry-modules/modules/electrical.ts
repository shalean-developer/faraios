import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const electricalModule: IndustryModule = {
  slug: "electrical",
  name: "Electrical Services",
  description: "Electrical installation, repair, and inspection",
  icon: "zap",
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
          key: "electrical_issue",
          type: "dropdown",
          label: "Electrical issue",
          options: ["Inspection", "Lights", "Plugs", "Wiring", "DB board", "Emergency", "Other"],
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
          key: "safety_urgency",
          type: "dropdown",
          label: "Safety urgency",
          options: ["Routine", "Urgent", "Safety hazard", "Emergency"],
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
    categoryPresets: ["Repair", "Installation", "Inspection", "Emergency"],
    templates: [
      {
        name: "Electrical Inspection",
        category: "Inspection",
        description: "Certificate of compliance inspection and issue.",
        price: "850",
        durationMinutes: 120,
        addons: [],
      },
      {
        name: "Light Installation",
        category: "Installation",
        description: "Install new light fittings and fixtures.",
        price: "400",
        durationMinutes: 90,
        addons: [{ name: "Fitting supply", price: "200" }],
      },
      {
        name: "Plug Repair",
        category: "Repair",
        description: "Repair or replace faulty plugs and sockets.",
        price: "350",
        durationMinutes: 60,
        addons: [],
      },
      {
        name: "Wiring Repair",
        category: "Repair",
        description: "Diagnose and fix electrical wiring faults.",
        price: "550",
        durationMinutes: 90,
        addons: [{ name: "Parts supply", price: "200" }],
      },
      {
        name: "DB Board Inspection",
        category: "Inspection",
        description: "Distribution board safety inspection.",
        price: "650",
        durationMinutes: 90,
        addons: [],
      },
      {
        name: "Emergency Electrical Callout",
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
    booking: "Jobs",
    service: "Electrical Services",
    staff: "Electricians",
    customer: "Customers",
  },

  pricingExamples: [
    { label: "Callout Fee", fromPrice: "R450" },
    { label: "Plug Repair", fromPrice: "R350" },
    { label: "Light Installation", fromPrice: "R400" },
  ],

  teamRoles: ["Electrician", "Apprentice", "Compliance Inspector"],

  setupChecklist: [
    "Import default electrical services",
    "Set service areas and call-out fees",
    "Publish your booking page",
    "Connect payments",
    "Add your first job",
  ],

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for electrical businesses",
      description: "Import common electrical services.",
    },
  },
};
