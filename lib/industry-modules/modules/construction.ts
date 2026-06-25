import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const constructionModule: IndustryModule = {
  slug: "construction",
  name: "Construction",
  description: "Construction, painting, and renovation projects",
  icon: "hammer",
  version: "2.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Portfolio", "Contact"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder([
      ...STANDARD_CUSTOMER_FIELDS,
      field(
        {
          key: "project_type",
          type: "dropdown",
          label: "Project type",
          options: ["Site Inspection", "Renovation", "Building", "Painting", "Tiling", "Roofing", "Brickwork", "Other"],
          section: "Project",
        },
        11
      ),
      field(
        {
          key: "property_type",
          type: "dropdown",
          label: "Property type",
          options: ["Residential", "Commercial", "Industrial", "Other"],
          section: "Project",
        },
        12
      ),
      field(
        {
          key: "project_size",
          type: "dropdown",
          label: "Project size",
          options: ["Small", "Medium", "Large", "Custom"],
          section: "Project",
        },
        13
      ),
      field(
        {
          key: "budget_range",
          type: "text",
          label: "Budget range",
          section: "Project",
        },
        14
      ),
      field(
        {
          key: "photos",
          type: "file",
          label: "Photos / plans",
          section: "Project",
        },
        15
      ),
      field(
        {
          key: "site_notes",
          type: "textarea",
          label: "Site address notes",
          section: "Location",
        },
        32
      ),
    ]),
  },

  services: {
    categoryPresets: ["Inspection", "Renovation", "Building", "Finishing", "Management"],
    templates: [
      {
        name: "Site Inspection",
        category: "Inspection",
        description: "On-site assessment and project scoping.",
        price: "500",
        durationMinutes: 90,
        addons: [],
      },
      {
        name: "Renovation Quote",
        category: "Renovation",
        description: "Detailed renovation quote after site visit.",
        price: "1000",
        durationMinutes: 120,
        addons: [],
      },
      {
        name: "Building Project",
        category: "Building",
        description: "Custom building project — quote on inspection.",
        price: "0",
        durationMinutes: 480,
        addons: [],
      },
      {
        name: "Painting",
        category: "Finishing",
        description: "Interior or exterior painting project.",
        price: "1500",
        durationMinutes: 480,
        addons: [{ name: "Wall preparation", price: "800" }],
      },
      {
        name: "Tiling",
        category: "Finishing",
        description: "Floor and wall tiling installation.",
        price: "2500",
        durationMinutes: 480,
        addons: [],
      },
      {
        name: "Roofing",
        category: "Building",
        description: "Roof repairs and installation.",
        price: "3500",
        durationMinutes: 480,
        addons: [],
      },
      {
        name: "Brickwork",
        category: "Building",
        description: "Bricklaying and structural brickwork.",
        price: "2000",
        durationMinutes: 480,
        addons: [],
      },
      {
        name: "Project Management",
        category: "Management",
        description: "End-to-end construction project management.",
        price: "5000",
        durationMinutes: 240,
        addons: [],
      },
    ],
  },

  growth: {
    seoPageTypes: ["project", "service"],
    serviceLabel: "Construction",
    heroSubtitle: "Quality construction with clear timelines and professional results.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "project_pipeline", label: "Active project pipeline value" }],
    reportTemplates: [{ key: "projects_by_type", label: "Projects by type" }],
    aiPromptContext: "This is a construction business. Focus on project scope, quotes, and timelines.",
  },

  terminology: {
    booking: "Projects",
    service: "Services",
    staff: "Contractors",
    customer: "Clients",
    revenue: "Quotes",
  },

  pricingExamples: [
    { label: "Site Inspection", fromPrice: "R500" },
    { label: "Renovation Quote", fromPrice: "R1,000" },
    { label: "Painting", fromPrice: "R1,500" },
    { label: "Tiling", fromPrice: "R2,500" },
    { label: "Building Project", fromPrice: "Custom quote" },
  ],

  teamRoles: ["Contractor", "Project Manager", "Foreman", "Quantity Surveyor"],

  setupChecklist: [
    "Import default construction services",
    "Set project types and quote process",
    "Publish your booking page",
    "Connect payments",
    "Add your first project or quote",
  ],

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for construction businesses",
      description: "Import common construction and finishing services.",
    },
  },
};
