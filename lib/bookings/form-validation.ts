import type { BookingFormField, BookingFormFieldType } from "@/types/booking-form";

const SYSTEM_KEYS = new Set([
  "customer_name",
  "customer_email",
  "customer_phone",
  "service_id",
  "booking_date",
  "preferred_time",
  "address",
  "notes",
  "consent",
]);

export function isSystemFieldKey(key: string): boolean {
  return SYSTEM_KEYS.has(key);
}

export function sanitizeCustomResponses(
  fields: BookingFormField[],
  input: Record<string, unknown> | undefined
): Record<string, unknown> {
  const customFields = fields.filter((f) => !f.system);
  const result: Record<string, unknown> = {};

  for (const field of customFields) {
    const value = input?.[field.key];
    if (value === undefined || value === null || value === "") continue;
    result[field.key] = sanitizeFieldValue(field, value);
  }

  return result;
}

function sanitizeFieldValue(field: BookingFormField, value: unknown): unknown {
  if (field.type === "number") {
    const num = Number(value);
    return Number.isFinite(num) ? num : value;
  }
  if (field.type === "checkbox") {
    return Boolean(value);
  }
  if (field.type === "multiselect") {
    return Array.isArray(value) ? value.map(String) : [String(value)];
  }
  if (typeof value === "string") {
    return value.trim().slice(0, 5000);
  }
  return value;
}

export function validateBookingFormSubmission(
  fields: BookingFormField[],
  payload: Record<string, unknown>
): { ok: true } | { ok: false; error: string } {
  for (const field of fields) {
    const value = payload[field.key];

    if (field.required) {
      if (value === undefined || value === null || value === "") {
        return { ok: false, error: `${field.label} is required.` };
      }
      if (field.type === "consent" && value !== true) {
        return { ok: false, error: `${field.label} must be accepted.` };
      }
    }

    if (value === undefined || value === null || value === "") continue;

    const typeError = validateFieldType(field, value);
    if (typeError) return typeError;

    if (
      (field.type === "dropdown" || field.type === "radio") &&
      field.options?.length
    ) {
      if (!field.options.includes(String(value))) {
        return { ok: false, error: `${field.label} has an invalid option.` };
      }
    }

    if (field.type === "multiselect" && field.options?.length) {
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        if (!field.options.includes(String(item))) {
          return { ok: false, error: `${field.label} has an invalid option.` };
        }
      }
    }
  }

  return { ok: true };
}

function validateFieldType(
  field: BookingFormField,
  value: unknown
): { ok: false; error: string } | null {
  const validators: Partial<Record<BookingFormFieldType, () => boolean>> = {
    email: () => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    phone: () => typeof value === "string" && value.length >= 6,
    number: () => Number.isFinite(Number(value)),
    date: () => typeof value === "string" && !Number.isNaN(Date.parse(value)),
    time: () => typeof value === "string" && /^\d{2}:\d{2}/.test(value),
    consent: () => value === true,
    checkbox: () => typeof value === "boolean",
  };

  const validator = validators[field.type];
  if (!validator) return null;
  if (!validator()) {
    return { ok: false, error: `${field.label} is invalid.` };
  }
  return null;
}

export function combineDateAndTime(dateIso: string, preferredTime?: string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid booking date.");
  }
  if (!preferredTime?.trim()) {
    return date.toISOString();
  }
  const [hours, minutes] = preferredTime.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return date.toISOString();
  }
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}
