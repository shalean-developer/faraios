import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const fitnessModule: IndustryModule = {
  slug: "fitness",
  name: "Fitness & Gyms",
  description: "Gyms, studios, and personal training",
  icon: "dumbbell",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Pricing", "Contact"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder([
      ...STANDARD_CUSTOMER_FIELDS,
      field(
        {
          key: "membership_type",
          type: "dropdown",
          label: "Membership type",
          options: ["Trial", "Monthly", "Annual"],
          section: "Fitness",
        },
        11
      ),
      field(
        {
          key: "class_type",
          type: "dropdown",
          label: "Session type",
          options: ["Personal training", "Group class", "Assessment"],
          section: "Fitness",
        },
        12
      ),
      field(
        {
          key: "health_notes",
          type: "textarea",
          label: "Health notes & injuries",
          section: "Fitness",
        },
        13
      ),
    ]),
  },

  services: {
    categoryPresets: ["Personal training", "Group classes", "Memberships", "Assessments"],
    templates: [
      {
        name: "Personal training session",
        category: "Personal training",
        description: "One-on-one coaching session.",
        price: "350",
        durationMinutes: 60,
        addons: [{ name: "Nutrition consult", price: "200" }],
      },
      {
        name: "Group fitness class",
        category: "Group classes",
        description: "High-energy group workout.",
        price: "120",
        durationMinutes: 45,
        addons: [],
      },
      {
        name: "Fitness assessment",
        category: "Assessments",
        description: "Initial fitness assessment and program design.",
        price: "250",
        durationMinutes: 45,
        addons: [],
      },
      {
        name: "Monthly membership",
        category: "Memberships",
        description: "Unlimited gym access for one month.",
        price: "650",
        durationMinutes: 60,
        addons: [],
      },
    ],
  },

  growth: {
    seoPageTypes: ["service"],
    serviceLabel: "Fitness",
    heroSubtitle: "Structured coaching programs focused on measurable progress and supportive trainers.",
  },

  intelligence: {
    kpiDefinitions: [
      { key: "class_attendance", label: "Class attendance rate" },
      { key: "membership_retention", label: "Membership retention" },
    ],
    reportTemplates: [{ key: "sessions_by_type", label: "Sessions by type" }],
    aiPromptContext: "This is a fitness and gym business. Focus on memberships, class attendance, and personal training.",
  },

  terminology: {
    booking: "Session",
    service: "Class",
    staff: "Coach",
    customer: "Member",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for fitness businesses",
      description: "Import common training sessions and memberships.",
    },
  },
};
