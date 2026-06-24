import type { IndustryModule } from "../types";
import { STANDARD_CUSTOMER_FIELDS, field, withSortOrder } from "../shared/field-builders";

export const tourismTravelModule: IndustryModule = {
  slug: "tourism",
  name: "Tourism & Travel",
  description: "Tours, travel experiences, and hospitality",
  icon: "plane",
  version: "1.0.0",

  onboarding: {
    defaultPages: ["Home", "Services", "About", "Pricing", "Contact", "FAQ"],
    defaultFeatures: ["booking", "payments", "blog"],
  },

  booking: {
    staffAssignmentMode: "manual",
    formPreset: withSortOrder([
      ...STANDARD_CUSTOMER_FIELDS,
      field(
        {
          key: "tour_package",
          type: "dropdown",
          label: "Tour package",
          helperText: "Or select from the service catalog above.",
          section: "Trip details",
        },
        11
      ),
      field(
        {
          key: "travel_date",
          type: "date",
          label: "Travel date",
          required: true,
          section: "Trip details",
        },
        12
      ),
      field(
        { key: "guests", type: "number", label: "Number of guests", required: true, section: "Trip details" },
        13
      ),
      field(
        { key: "nationality", type: "text", label: "Nationality", section: "Guest details" },
        14
      ),
      field(
        {
          key: "passport_requirements",
          type: "checkbox",
          label: "Passport assistance required",
          section: "Guest details",
        },
        15
      ),
      field(
        {
          key: "special_requests",
          type: "textarea",
          label: "Special requests",
          section: "Trip details",
        },
        16
      ),
    ]),
  },

  services: {
    categoryPresets: ["Day tours", "Multi-day", "Safari", "Transfers", "Custom"],
    templates: [
      {
        name: "City day tour",
        category: "Day tours",
        description: "Guided city highlights with transport included.",
        price: "850",
        durationMinutes: 480,
        addons: [{ name: "Private guide upgrade", price: "400" }],
      },
      {
        name: "Safari experience",
        category: "Safari",
        description: "Full-day safari with game drive and lunch.",
        price: "2500",
        durationMinutes: 600,
        addons: [{ name: "Photography guide", price: "350" }],
      },
      {
        name: "Airport transfer",
        category: "Transfers",
        description: "Private airport pickup or drop-off.",
        price: "450",
        durationMinutes: 90,
        addons: [{ name: "Meet & greet", price: "100" }],
      },
      {
        name: "Multi-day tour package",
        category: "Multi-day",
        description: "Curated multi-day itinerary with accommodation.",
        price: "12000",
        durationMinutes: 4320,
        addons: [{ name: "Travel insurance assist", price: "250" }],
      },
    ],
  },

  workflows: [
    {
      name: "Send deposit reminder",
      triggerType: "quote_accepted",
      steps: [{ action: "send_email", config: { template: "deposit_reminder" } }],
      enabled: false,
    },
  ],

  growth: {
    seoPageTypes: ["destination", "service"],
    contentSeeds: [
      {
        title: "Destination pages",
        description: "Tour destination and experience landing pages",
        type: "destination",
      },
    ],
    serviceLabel: "Tours & Travel",
    heroSubtitle:
      "Unforgettable tours and travel experiences with expert guides and seamless booking.",
  },

  intelligence: {
    kpiDefinitions: [
      { key: "avg_guests_per_booking", label: "Average guests per booking" },
      { key: "deposit_conversion", label: "Deposit conversion rate" },
    ],
    reportTemplates: [
      { key: "tours_by_package", label: "Bookings by tour package" },
    ],
    aiPromptContext:
      "This is a tourism and travel business. Focus on tour packages, guest counts, deposits, and seasonal demand.",
  },

  terminology: {
    booking: "Reservation",
    service: "Tour package",
    staff: "Tour guide",
    customer: "Guest",
  },

  dashboardExtensions: {
    servicesQuickStart: {
      title: "Quick start for tourism businesses",
      description: "Import common tour packages and transfer services.",
    },
  },
};
