import type { BookingFormField } from "@/types/booking-form";

export function field(
  partial: Omit<BookingFormField, "sortOrder"> & { sortOrder?: number },
  sortOrder: number
): BookingFormField {
  return { sortOrder, ...partial };
}

export const STANDARD_CUSTOMER_FIELDS: BookingFormField[] = [
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

export function withSortOrder(fields: BookingFormField[]): BookingFormField[] {
  return fields.map((f, index) => ({ ...f, sortOrder: f.sortOrder ?? index }));
}
