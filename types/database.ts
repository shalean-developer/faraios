/** Aligns with public.industries */
export type Industry = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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
  /** Live / launched site (counts toward “active sites”). */
  is_published?: boolean;
  /** Website build pipeline status. */
  build_status?: string | null;
  /** Internal admin: assigned builder name (string until `team` table exists). */
  assigned_developer?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  /** Pricing tier slug: starter | business | premium */
  plan?: string | null;
  subscription_status?: string;
  next_billing_date?: string | null;
  /** Public production URL for launched company website. */
  production_url?: string | null;
  /** Product lifecycle status for company project card/views. */
  project_status?: string;
  /** Raw onboarding payload for admin and project detail use cases. */
  onboarding_data?: Record<string, unknown> | null;
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

/** Aligns with public.bookings */
export type Booking = {
  id: string;
  company_id: string;
  customer_name: string | null;
  service: string | null;
  date: string | null;
  booking_date?: string | null;
  status: string | null;
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
