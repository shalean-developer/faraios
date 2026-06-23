import { describe, expect, it } from "vitest";

import { validateBookingFormSubmission } from "../lib/bookings/form-validation";
import type { BookingFormField } from "../types/booking-form";

const fields: BookingFormField[] = [
  {
    key: "customer_name",
    type: "text",
    label: "Name",
    required: true,
    system: true,
    sortOrder: 0,
  },
  {
    key: "property_type",
    type: "dropdown",
    label: "Property type",
    required: true,
    options: ["House", "Apartment"],
    sortOrder: 1,
  },
  {
    key: "consent",
    type: "consent",
    label: "Consent",
    required: true,
    system: true,
    sortOrder: 2,
  },
];

describe("validateBookingFormSubmission", () => {
  it("requires configured fields", () => {
    const result = validateBookingFormSubmission(fields, {
      customer_name: "Jane",
      property_type: "House",
      consent: true,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing required custom field", () => {
    const result = validateBookingFormSubmission(fields, {
      customer_name: "Jane",
      consent: true,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid dropdown option", () => {
    const result = validateBookingFormSubmission(fields, {
      customer_name: "Jane",
      property_type: "Castle",
      consent: true,
    });
    expect(result.ok).toBe(false);
  });
});
