import type { BookingFormField } from "@/types/booking-form";

function field(
  partial: Omit<BookingFormField, "sortOrder"> & { sortOrder?: number },
  sortOrder: number
): BookingFormField {
  return { sortOrder, ...partial };
}

const STANDARD_CUSTOMER_FIELDS: BookingFormField[] = [
  field(
    {
      key: "customer_name",
      type: "text",
      label: "Full name",
      required: true,
      system: true,
      section: "Contact",
    },
    0
  ),
  field(
    {
      key: "customer_email",
      type: "email",
      label: "Email",
      required: true,
      system: true,
      section: "Contact",
    },
    1
  ),
  field(
    {
      key: "customer_phone",
      type: "phone",
      label: "Phone",
      system: true,
      section: "Contact",
    },
    2
  ),
  field(
    {
      key: "service_id",
      type: "dropdown",
      label: "Service",
      required: true,
      system: true,
      section: "Service",
      helperText: "Options loaded from your service catalog.",
    },
    10
  ),
  field(
    {
      key: "booking_date",
      type: "date",
      label: "Preferred date",
      required: true,
      system: true,
      section: "Schedule",
    },
    20
  ),
  field(
    {
      key: "preferred_time",
      type: "time",
      label: "Preferred time",
      system: true,
      section: "Schedule",
    },
    21
  ),
  field(
    {
      key: "address",
      type: "address",
      label: "Service address",
      system: true,
      section: "Location",
    },
    30
  ),
  field(
    {
      key: "notes",
      type: "textarea",
      label: "Additional notes",
      system: true,
      section: "Details",
    },
    40
  ),
  field(
    {
      key: "consent",
      type: "consent",
      label: "I agree to be contacted about this booking request.",
      required: true,
      system: true,
      section: "Consent",
    },
    50
  ),
];

function cleaningFields(): BookingFormField[] {
  return [
    ...STANDARD_CUSTOMER_FIELDS,
    field(
      {
        key: "property_type",
        type: "dropdown",
        label: "Property type",
        options: ["House", "Apartment", "Office", "Other"],
        section: "Property",
      },
      11
    ),
    field(
      {
        key: "bedrooms",
        type: "number",
        label: "Bedrooms",
        section: "Property",
      },
      12
    ),
    field(
      {
        key: "bathrooms",
        type: "number",
        label: "Bathrooms",
        section: "Property",
      },
      13
    ),
    field(
      {
        key: "cleaning_type",
        type: "dropdown",
        label: "Cleaning type",
        options: ["Standard", "Deep cleaning", "Move-in/out", "Once-off"],
        section: "Service details",
      },
      14
    ),
    field(
      {
        key: "frequency",
        type: "dropdown",
        label: "Frequency",
        options: ["Once-off", "Weekly", "Bi-weekly", "Monthly"],
        section: "Service details",
      },
      15
    ),
    field(
      {
        key: "access_instructions",
        type: "textarea",
        label: "Access instructions",
        section: "Location",
      },
      31
    ),
  ];
}

function tradeFields(serviceLabel: string): BookingFormField[] {
  return [
    ...STANDARD_CUSTOMER_FIELDS,
    field(
      {
        key: "service_type",
        type: "dropdown",
        label: serviceLabel,
        options: ["Repair", "Installation", "Inspection", "Emergency", "Other"],
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
        key: "site_notes",
        type: "textarea",
        label: "Site notes",
        section: "Location",
      },
      32
    ),
  ];
}

function beautyFields(): BookingFormField[] {
  return [
    ...STANDARD_CUSTOMER_FIELDS,
    field(
      {
        key: "preferred_staff",
        type: "text",
        label: "Preferred staff member",
        section: "Appointment",
      },
      11
    ),
    field(
      {
        key: "client_notes",
        type: "textarea",
        label: "Client notes",
        section: "Details",
      },
      41
    ),
  ];
}

function constructionFields(): BookingFormField[] {
  return [
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
  ];
}

function tourismFields(): BookingFormField[] {
  return [
    ...STANDARD_CUSTOMER_FIELDS,
    field(
      {
        key: "party_size",
        type: "number",
        label: "Party size",
        section: "Trip details",
      },
      11
    ),
    field(
      {
        key: "tour_type",
        type: "dropdown",
        label: "Tour type",
        options: ["Day tour", "Multi-day", "Custom", "Transfer"],
        section: "Trip details",
      },
      12
    ),
  ];
}

const PRESETS: Record<string, BookingFormField[]> = {
  cleaning: cleaningFields(),
  electrical: tradeFields("Service category"),
  plumbing: tradeFields("Service type"),
  gardening: [
    ...STANDARD_CUSTOMER_FIELDS,
    field(
      {
        key: "garden_size",
        type: "dropdown",
        label: "Garden size",
        options: ["Small", "Medium", "Large"],
        section: "Garden",
      },
      11
    ),
    field(
      {
        key: "service_type",
        type: "dropdown",
        label: "Service type",
        options: ["Maintenance", "Landscaping", "Cleanup", "Irrigation"],
        section: "Garden",
      },
      12
    ),
    field(
      {
        key: "waste_removal",
        type: "checkbox",
        label: "Waste removal needed",
        section: "Garden",
      },
      13
    ),
  ],
  beauty: beautyFields(),
  gym: [
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
        label: "Class type",
        options: ["Personal training", "Group class", "Assessment"],
        section: "Fitness",
      },
      12
    ),
    field(
      {
        key: "health_notes",
        type: "textarea",
        label: "Health notes",
        section: "Fitness",
      },
      13
    ),
  ],
  construction: constructionFields(),
  tourism: tourismFields(),
  default: STANDARD_CUSTOMER_FIELDS,
};

export function getIndustryBookingPreset(industrySlug: string | null): BookingFormField[] {
  const slug = industrySlug?.trim().toLowerCase() || "default";
  const preset = PRESETS[slug] ?? PRESETS.default;
  return preset.map((f, index) => ({ ...f, sortOrder: f.sortOrder ?? index }));
}

export function mergeBookingFormFields(
  base: BookingFormField[],
  overrides: BookingFormField[]
): BookingFormField[] {
  const map = new Map(base.map((f) => [f.key, f]));
  for (const field of overrides) {
    map.set(field.key, { ...map.get(field.key), ...field, key: field.key });
  }
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export const INDUSTRY_PRESET_SLUGS = Object.keys(PRESETS).filter((k) => k !== "default");
