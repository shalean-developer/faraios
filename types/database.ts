import type { BookingRequestType } from "@/lib/bookings/request-type";

/** Aligns with public.industries */
export type Industry = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  icon?: string | null;
  module_version?: string | null;
};

/** Feature option for onboarding UI (not persisted unless you add a table later). */
export type Feature = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
};

/** Aligns with public.companies */
export type Company = {
  id: string;
  name: string;
  slug: string;
  industry_id: string | null;
  created_at: string;
  /** @deprecated Use websites.status = 'published' instead. Kept in sync via DB trigger. */
  is_published?: boolean;
  /** Website build pipeline status. */
  build_status?: string | null;
  /** Internal admin: assigned builder name (string until `team` table exists). */
  assigned_developer?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  contact_phone?: string | null;
  contact_location?: string | null;
  /** Pricing tier slug: starter | business | pro | enterprise (legacy: premium → pro) */
  plan?: string | null;
  subscription_status?: string;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  next_billing_date?: string | null;
  paystack_customer_code?: string | null;
  paystack_subscription_code?: string | null;
  /** Public production URL for launched company website. */
  production_url?: string | null;
  /** Product lifecycle status for company project card/views. */
  project_status?: string;
  /** Raw onboarding payload for admin and project detail use cases. */
  onboarding_data?: Record<string, unknown> | null;
  listed_in_marketplace?: boolean;
  marketplace_summary?: string | null;
  marketplace_location?: string | null;
  marketplace_featured?: boolean;
  service_areas?: string | null;
  business_description?: string | null;
  booking_hours?: Record<string, unknown> | null;
  blocked_booking_dates?: string[];
  brand_logo_url?: string | null;
  brand_primary_color?: string | null;
  brand_accent_color?: string | null;
  notification_preferences?: Record<string, unknown> | null;
  industry_template_applied?: boolean;
  industry_template_key?: string | null;
  template_applied_at?: string | null;
  updated_at?: string | null;
};

/** Aligns with public.customers */
export type Customer = {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Aligns with public.company_services */
export type CompanyService = {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  description: string | null;
  base_price_cents: number;
  active: boolean;
  duration_minutes?: number | null;
  addons?: unknown[] | null;
  industry_key?: string | null;
  is_template_service?: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
};

/** Aligns with public.connected_websites */
export type ConnectedWebsite = {
  id: string;
  company_id: string;
  type: "external" | "hosted";
  production_url: string | null;
  api_key: string;
  name?: string | null;
  status?: string;
  primary_domain?: string | null;
  preview_subdomain?: string | null;
  hosting_provider?: string | null;
  booking_enabled?: boolean;
  tracking_enabled?: boolean;
  seo_enabled?: boolean;
  api_key_status?: "active" | "revoked";
  api_key_last_used_at?: string | null;
  website_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type { BookingStatus } from "@/lib/bookings/status";
export { BOOKING_STATUSES } from "@/lib/bookings/status";

/** Aligns with public.bookings */
export type Booking = {
  id: string;
  company_id: string;
  customer_name: string | null;
  service: string | null;
  booking_date?: string | null;
  status: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  source?: string | null;
  request_type?: BookingRequestType | null;
  customer_id?: string | null;
  service_id?: string | null;
  price_cents?: number | null;
  assigned_staff_id?: string | null;
  address?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  duration_minutes?: number | null;
  custom_responses?: Record<string, unknown> | null;
  addons?: unknown[] | null;
  payment_status?: string | null;
  source_website?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  website_id?: string | null;
  device_type?: string | null;
  consent_given?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CompanyWithIndustry = Company & {
  industries: Pick<Industry, "name" | "slug"> | null;
};

/** Aligns with public.users */
export type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  created_at?: string;
};

/** Aligns with public.memberships */
export type Membership = {
  id: string;
  user_id: string;
  company_id: string;
  role: string | null;
  created_at?: string;
};

/** Company summary for workspace switcher UI */
export type UserCompany = {
  id: string;
  slug: string;
  name: string;
};

/** Aligns with public.projects */
export type Project = {
  id: string;
  company_id: string;
  name: string;
  status: string;
  progress: number;
  current_stage: string | null;
  created_at: string;
};

/** Aligns with public.project_activities */
export type ProjectActivity = {
  id: string;
  project_id: string;
  title: string;
  completed: boolean;
  stage: string;
  sort_order: number;
  created_at?: string;
};

/** Aligns with public.websites */
export type Website = {
  id: string;
  client_id: string;
  name: string;
  industry: string;
  template: string;
  domain: string | null;
  subdomain: string;
  status: "draft" | "published";
  connection_status?: string;
  hosting_provider?: string | null;
  booking_enabled?: boolean;
  tracking_enabled?: boolean;
  seo_connection_enabled?: boolean;
  preview_subdomain?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  og_image?: string | null;
  created_at: string;
};

/** Aligns with public.website_content */
export type WebsiteContent = {
  id: string;
  website_id: string;
  section: string;
  content: Record<string, unknown>;
};

/** Aligns with public.hosting_subscriptions */
export type HostingSubscription = {
  id: string;
  company_id: string;
  plan_slug: string;
  status: "pending" | "active" | "suspended" | "cancelled";
  subdomain: string | null;
  custom_domain: string | null;
  domain_status: "none" | "pending" | "verified";
  ssl_status: "not_started" | "pending" | "active" | "failed";
  bandwidth_limit_gb: number;
  sites_limit: number;
  next_billing_date: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Aligns with public.hosting_payments */
export type HostingPayment = {
  id: string;
  subscription_id: string | null;
  company_id: string;
  plan_slug: string;
  amount_cents: number;
  currency: string;
  paystack_reference: string | null;
  status: "pending" | "success" | "failed";
  paid_at: string | null;
  created_at: string;
};
