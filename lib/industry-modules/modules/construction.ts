import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const constructionModule: IndustryModule = {
  slug: "construction",
  name: "Construction & Painting",
  description: "Construction, painting, and renovation projects",
  icon: "hammer",
  version: "1.0.0",

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
          options: ["Painting", "Renovation", "Repairs", "New build", "Other"],
          section: "Project",
        },
        11
      ),
      field(
        {
          key: "project_scope",
          type: "textarea",
          label: "Project scope",
          section: "Project",
        },
        12
      ),
      field(
        {
          key: "site_notes",
          type: "textarea",
          label: "Site notes",
          section: "Location",
        },
        32
      ),
    ]),
  },

  services: {
    categoryPresets: ["Painting", "Renovation", "Repairs", "New build"],
    templates: [
      {
        name: "Interior painting",
        category: "Painting",
        description: "Professional interior painting for homes and offices.",
        price: "3500",
        durationMinutes: 480,
        addons: [{ name: "Wall preparation", price: "800" }],
      },
      {
        name: "Exterior painting",
        category: "Painting",
        description: "Weather-resistant exterior paint application.",
        price: "6500",
        durationMinutes: 720,
        addons: [{ name: "Scaffolding", price: "1500" }],
      },
      {
        name: "Renovation quote",
        category: "Renovation",
        description: "On-site assessment and renovation quote.",
        price: "0",
        durationMinutes: 90,
        addons: [],
      },
    ],
  },

  growth: {
    seoPageTypes: ["project", "service"],
    serviceLabel: "Construction",
    heroSubtitle: "Quality construction and painting with clear timelines and professional results.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "project_pipeline", label: "Active project pipeline value" }],
    reportTemplates: [{ key: "projects_by_type", label: "Projects by type" }],
    aiPromptContext: "This is a construction and painting business. Focus on project scope, quotes, and timelines.",
  },

  terminology: {
    booking: "Site visit",
    service: "Project",
    staff: "Contractor",
    customer: "Client",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for construction businesses",
      description: "Import common construction and painting services.",
    },
  },
};
