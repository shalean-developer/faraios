export type BookingFormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "multiselect"
  | "date"
  | "time"
  | "address"
  | "file"
  | "hidden"
  | "consent";

export type BookingFormField = {
  key: string;
  type: BookingFormFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  section?: string;
  options?: string[];
  defaultValue?: string | number | boolean;
  sortOrder: number;
  system?: boolean;
};

export type BookingFormStatus = "draft" | "published";

export type BookingForm = {
  id: string;
  company_id: string;
  industry_slug: string | null;
  name: string;
  status: BookingFormStatus;
  fields: BookingFormField[];
  version: number;
  created_at: string;
  updated_at: string;
};

export type ServiceAddon = {
  id: string;
  name: string;
  price_cents: number;
};

export type BookingHoursDay = {
  open: string;
  close: string;
  closed?: boolean;
};

export type BookingHours = Record<string, BookingHoursDay>;

export type PublicBookingInput = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceId?: string;
  service?: string;
  bookingDate: string;
  preferredTime?: string;
  address?: string;
  notes?: string;
  addons?: ServiceAddon[];
  customResponses?: Record<string, unknown>;
  sourceWebsite?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  websiteId?: string;
  deviceType?: string;
  consentGiven?: boolean;
  landingPage?: string;
  conversionPage?: string;
};
