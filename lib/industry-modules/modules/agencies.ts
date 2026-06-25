import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

const V8_SETUP = [
  "Import default agency packages",
  "Complete business profile and portfolio links",
  "Publish your discovery booking page",
  "Connect payments",
  "Add your first client or campaign",
];

export const agenciesModule: IndustryModule = {
  slug: "agencies",
  name: "Agencies",
  description: "Marketing, design, and digital agencies",
  icon: "megaphone",
  version: "2.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Portfolio", "Contact"],
    defaultFeatures: ["booking", "payments", "blog"],
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
          options: ["Website", "SEO", "Social Media", "Branding", "Ads", "Retainer", "Other"],
          section: "Project",
        },
        11
      ),
      field(
        {
          key: "business_goals",
          type: "textarea",
          label: "Business goals",
          required: true,
          section: "Project",
        },
        12
      ),
      field(
        {
          key: "budget_range",
          type: "text",
          label: "Budget range",
          section: "Project",
        },
        13
      ),
      field(
        {
          key: "timeline",
          type: "text",
          label: "Timeline",
          section: "Project",
        },
        14
      ),
      field(
        {
          key: "social_links",
          type: "textarea",
          label: "Website / social links",
          section: "Project",
        },
        15
      ),
      field(
        {
          key: "discovery_notes",
          type: "textarea",
          label: "Discovery call notes",
          section: "Discovery",
        },
        41
      ),
    ]),
  },

  services: {
    categoryPresets: ["Web", "SEO", "Social", "Branding", "Ads", "Retainer"],
    templates: [
      {
        name: "Website Design",
        category: "Web",
        description: "Professional website design and build.",
        price: "3500",
        durationMinutes: 480,
        addons: [{ name: "E-commerce setup", price: "1500" }],
      },
      {
        name: "SEO Service",
        category: "SEO",
        description: "Monthly SEO optimisation package.",
        price: "1500",
        durationMinutes: 120,
        addons: [],
      },
      {
        name: "Social Media Management",
        category: "Social",
        description: "Monthly social media management.",
        price: "2000",
        durationMinutes: 120,
        addons: [],
      },
      {
        name: "Branding Package",
        category: "Branding",
        description: "Logo, brand guide, and collateral.",
        price: "4500",
        durationMinutes: 480,
        addons: [],
      },
      {
        name: "Ad Campaign Management",
        category: "Ads",
        description: "Paid ads setup and management.",
        price: "2500",
        durationMinutes: 180,
        addons: [],
      },
      {
        name: "Monthly Retainer",
        category: "Retainer",
        description: "Ongoing agency support retainer.",
        price: "5000",
        durationMinutes: 120,
        addons: [],
      },
    ],
  },

  customers: {
    extraFieldKeys: ["company_name", "website_url", "budget_range"],
  },

  growth: {
    seoPageTypes: ["service", "project"],
    contentSeeds: [{ title: "Agency case studies", description: "Showcase client results." }],
    serviceLabel: "Agency Services",
    heroSubtitle: "Full-service agency packages for growing brands.",
  },

  intelligence: {
    kpiDefinitions: [{ key: "active_campaigns", label: "Active campaigns" }],
    reportTemplates: [{ key: "projects_by_package", label: "Projects by package" }],
    aiPromptContext: "This is a marketing agency. Focus on retainers, campaign performance, and discovery calls.",
  },

  terminology: {
    booking: "Projects",
    service: "Packages",
    staff: "Account Manager",
    customer: "Clients",
    revenue: "Campaigns",
  },

  pricingExamples: [
    { label: "Website Design", fromPrice: "R3,500" },
    { label: "SEO Package", fromPrice: "R1,500/month" },
    { label: "Social Media Management", fromPrice: "R2,000/month" },
  ],

  teamRoles: ["Account Manager", "Designer", "SEO Specialist", "Social Media Manager", "Strategist"],

  setupChecklist: V8_SETUP,

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for agencies",
      description: "Import common agency packages and retainers.",
    },
  },
};
