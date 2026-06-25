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

export type BookingFormTemplate = {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  serviceId?: string | null;
};

export type BookingFormBranding = {
  businessName?: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  useCompanyBranding?: boolean;
};

export type BookingFormSettings = {
  templates?: BookingFormTemplate[];
  branding?: BookingFormBranding;
  confirmationMessage?: string;
  paymentRequired?: boolean;
  multiStep?: boolean;
  cleanerRequirements?: string;
  showVatLine?: boolean;
};

export type BookingFormPricingRule = {
  id: string;
  company_id: string;
  service_id: string | null;
  base_price_cents: number;
  price_per_bedroom_cents: number;
  price_per_bathroom_cents: number;
  service_fee_cents: number;
  minimum_price_cents: number;
  maximum_price_cents: number | null;
  frequency_discounts: Record<string, number>;
  vat_rate_percent: number;
  custom_quote_enabled: boolean;
  active: boolean;
};

export type BookingFormExtra = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  active: boolean;
  sort_order: number;
};

export type BookingFormServiceArea = {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  sort_order: number;
};

export type PriceBreakdownLine = {
  label: string;
  amountCents: number;
};

export type BookingPriceSnapshot = {
  id: string;
  company_id: string;
  booking_id: string | null;
  breakdown: PriceBreakdownLine[];
  subtotal_cents: number;
  discount_cents: number;
  service_fee_cents: number;
  vat_cents: number;
  total_cents: number;
  pricing_rules_snapshot: Record<string, unknown>;
  created_at: string;
};

export type BookingForm = {
  id: string;
  company_id: string;
  industry_slug: string | null;
  name: string;
  status: BookingFormStatus;
  fields: BookingFormField[];
  settings?: BookingFormSettings;
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
  extraIds?: string[];
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
  calculatedTotalCents?: number;
};
