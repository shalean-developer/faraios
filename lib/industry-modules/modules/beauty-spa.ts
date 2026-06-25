import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const beautySpaModule: IndustryModule = {
  slug: "beauty",
  name: "Beauty & Spa",
  description: "Salons, spas, and wellness studios",
  icon: "flower",
  version: "2.0.0",

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
          key: "service_type",
          type: "dropdown",
          label: "Service type",
          options: ["Hair", "Makeup", "Nails", "Massage", "Facial", "Bridal", "Other"],
          section: "Appointment",
        },
        10
      ),
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
          label: "Preferred stylist",
          section: "Appointment",
        },
        12
      ),
      field(
        {
          key: "location_preference",
          type: "dropdown",
          label: "Location preference",
          options: ["In salon", "Mobile / at home", "No preference"],
          section: "Appointment",
        },
        13
      ),
      field(
        {
          key: "allergies",
          type: "textarea",
          label: "Allergies & sensitivities",
          section: "Health",
        },
        14
      ),
      field(
        {
          key: "membership_interest",
          type: "dropdown",
          label: "Membership interest",
          options: ["None", "Monthly", "Annual", "Gift voucher"],
          section: "Details",
        },
        15
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
        name: "Hair Styling",
        category: "Hair",
        description: "Cut, colour, and styling services.",
        price: "350",
        durationMinutes: 60,
        addons: [{ name: "Wash & blow-dry", price: "80" }],
      },
      {
        name: "Makeup",
        category: "Makeup",
        description: "Professional makeup application.",
        price: "450",
        durationMinutes: 60,
        addons: [{ name: "Lashes", price: "120" }],
      },
      {
        name: "Nails",
        category: "Nails",
        description: "Manicure and pedicure services.",
        price: "250",
        durationMinutes: 45,
        addons: [{ name: "Gel overlay", price: "100" }],
      },
      {
        name: "Massage",
        category: "Massage",
        description: "60-minute relaxation massage.",
        price: "550",
        durationMinutes: 60,
        addons: [{ name: "Aromatherapy", price: "80" }],
      },
      {
        name: "Facial Treatment",
        category: "Facial",
        description: "Deep cleanse, exfoliation, and hydration.",
        price: "450",
        durationMinutes: 45,
        addons: [{ name: "LED therapy", price: "120" }],
      },
      {
        name: "Bridal Package",
        category: "Packages",
        description: "Hair, makeup, and trial session package.",
        price: "2500",
        durationMinutes: 240,
        addons: [],
      },
    ],
  },

  customers: {
    extraFieldKeys: ["allergies", "preferred_staff", "membership_interest"],
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
    booking: "Appointments",
    service: "Treatments",
    staff: "Stylists",
    customer: "Clients",
  },

  pricingExamples: [
    { label: "Nails", fromPrice: "R250" },
    { label: "Makeup", fromPrice: "R450" },
    { label: "Hair Styling", fromPrice: "R350" },
  ],

  teamRoles: ["Stylist", "Therapist", "Receptionist", "Salon Manager"],

  setupChecklist: [
    "Import default beauty services",
    "Set stylist availability",
    "Publish your booking page",
    "Connect payments",
    "Add your first client appointment",
  ],

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for beauty & spa businesses",
      description: "Import common treatments with duration and pricing.",
    },
  },
};
