import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

const V8_SETUP = [
  "Import default freelancer services",
  "Set your hourly and project rates",
  "Publish your booking page",
  "Connect payments",
  "Add your first client or project",
];

export const freelancersModule: IndustryModule = {
  slug: "freelancers",
  name: "Freelancers",
  description: "Independent freelancers and solo professionals",
  icon: "user",
  version: "2.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Portfolio", "Contact"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "none",
    formPreset: withSortOrder([
      ...STANDARD_CUSTOMER_FIELDS,
      field(
        {
          key: "project_type",
          type: "dropdown",
          label: "Project type",
          options: ["Consultation", "Project", "Hourly", "Design", "Content", "Technical", "Other"],
          section: "Project",
        },
        11
      ),
      field(
        {
          key: "project_brief",
          type: "textarea",
          label: "Project brief",
          required: true,
          section: "Project",
        },
        12
      ),
      field(
        {
          key: "deadline",
          type: "date",
          label: "Deadline",
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
          key: "project_links",
          type: "textarea",
          label: "Files / links",
          section: "Project",
        },
        15
      ),
      field(
        {
          key: "consultation_notes",
          type: "textarea",
          label: "Consultation notes",
          section: "Consultation",
        },
        41
      ),
    ]),
  },

  services: {
    categoryPresets: ["Consultation", "Project", "Hourly", "Creative", "Technical"],
    templates: [
      {
        name: "Consultation",
        category: "Consultation",
        description: "One-on-one consultation session.",
        price: "500",
        durationMinutes: 60,
        addons: [],
      },
      {
        name: "Project Work",
        category: "Project",
        description: "Fixed-scope project engagement.",
        price: "1500",
        durationMinutes: 480,
        addons: [],
      },
      {
        name: "Hourly Service",
        category: "Hourly",
        description: "Billable hourly work.",
        price: "300",
        durationMinutes: 60,
        addons: [],
      },
      {
        name: "Design Service",
        category: "Creative",
        description: "Design deliverables and revisions.",
        price: "1200",
        durationMinutes: 240,
        addons: [],
      },
      {
        name: "Content Creation",
        category: "Creative",
        description: "Written or visual content production.",
        price: "800",
        durationMinutes: 180,
        addons: [],
      },
      {
        name: "Technical Support",
        category: "Technical",
        description: "Technical troubleshooting and support.",
        price: "400",
        durationMinutes: 60,
        addons: [],
      },
    ],
  },

  customers: {
    extraFieldKeys: ["company_name", "budget_range"],
  },

  growth: {
    seoPageTypes: ["service", "project"],
    serviceLabel: "Freelance Services",
    heroSubtitle: "Professional freelance services tailored to your clients.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "active_projects", label: "Active projects" }],
    reportTemplates: [{ key: "projects_by_type", label: "Projects by type" }],
    aiPromptContext: "This is a freelancer business. Focus on project scope, deadlines, and hourly billing.",
  },

  terminology: {
    booking: "Projects",
    service: "Services",
    staff: "Freelancer",
    customer: "Clients",
  },

  pricingExamples: [
    { label: "Hourly Service", fromPrice: "R300/hour" },
    { label: "Project Work", fromPrice: "R1,500" },
    { label: "Consultation", fromPrice: "R500" },
  ],

  teamRoles: ["Freelancer", "Associate", "Virtual Assistant"],

  setupChecklist: V8_SETUP,

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for freelancers",
      description: "Import common freelance services and rates.",
    },
  },
};
