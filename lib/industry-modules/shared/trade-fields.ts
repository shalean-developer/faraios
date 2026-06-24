import type { BookingFormField } from "@/types/booking-form";

import { STANDARD_CUSTOMER_FIELDS, field } from "./field-builders";

export function tradeBookingFields(serviceLabel: string): BookingFormField[] {
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
