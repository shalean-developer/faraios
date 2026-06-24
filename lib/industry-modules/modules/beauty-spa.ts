import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const beautySpaModule: IndustryModule = {
  slug: "beauty",
  name: "Beauty & Spa",
  description: "Salons, spas, and wellness studios",
  icon: "flower",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Pricing", "Contact", "FAQ"],
    defaultFeatures: ["booking", "payments"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder([
      ...STANDARD_CUSTOMER_FIELDS,
      field(
        {
          key: "treatment",
          type: "dropdown",
          label: "Treatment",
          helperText: "Or select from the service catalog above.",
          section: "Appointment",
        },
        11
      ),
      field(
        {
          key: "preferred_staff",
          type: "text",
          label: "Therapist preference",
          section: "Appointment",
        },
        12
      ),
      field(
        {
          key: "allergies",
          type: "textarea",
          label: "Allergies & sensitivities",
          section: "Health",
        },
        13
      ),
      field(
        {
          key: "membership_interest",
          type: "dropdown",
          label: "Membership interest",
          options: ["None", "Monthly", "Annual", "Gift voucher"],
          section: "Details",
        },
        14
      ),
      field(
        {
          key: "consultation_notes",
          type: "textarea",
          label: "Consultation notes",
          section: "Details",
        },
        41
      ),
    ]),
  },

  services: {
    categoryPresets: ["Facial", "Massage", "Nails", "Waxing", "Packages", "Memberships"],
    templates: [
      {
        name: "Swedish massage",
        category: "Massage",
        description: "60-minute full-body relaxation massage.",
        price: "650",
        durationMinutes: 60,
        addons: [{ name: "Aromatherapy upgrade", price: "80" }],
      },
      {
        name: "Classic facial",
        category: "Facial",
        description: "Deep cleanse, exfoliation, and hydration.",
        price: "550",
        durationMinutes: 45,
        addons: [{ name: "LED therapy", price: "120" }],
      },
      {
        name: "Full body waxing",
        category: "Waxing",
        description: "Professional waxing with premium products.",
        price: "450",
        durationMinutes: 60,
        addons: [],
      },
      {
        name: "Spa day package",
        category: "Packages",
        description: "Massage, facial, and refreshments.",
        price: "1200",
        durationMinutes: 180,
        addons: [{ name: "Champagne upgrade", price: "150" }],
      },
    ],
  },

  workflows: [
    {
      name: "Appointment reminder",
      triggerType: "booking_confirmed",
      steps: [{ action: "send_email", config: { template: "appointment_reminder" } }],
      enabled: false,
    },
  ],

  growth: {
    seoPageTypes: ["treatment", "service"],
    contentSeeds: [
      { title: "Treatment pages", description: "Individual treatment landing pages", type: "treatment" },
    ],
    serviceLabel: "Spa & Wellness",
    heroSubtitle:
      "Luxury treatments, expert therapists, and a relaxing experience from booking to checkout.",
  },

  intelligence: {
    kpiDefinitions: [
      { key: "treatment_utilization", label: "Treatment utilization" },
      { key: "membership_conversion", label: "Membership conversion rate" },
    ],
    reportTemplates: [
      { key: "therapist_bookings", label: "Bookings by therapist" },
    ],
    aiPromptContext:
      "This is a beauty and spa business. Focus on treatments, therapist schedules, memberships, and client allergies.",
  },

  terminology: {
    booking: "Appointment",
    service: "Treatment",
    staff: "Therapist",
    customer: "Client",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for beauty & spa businesses",
      description: "Import common treatments with duration and pricing.",
    },
  },
};
