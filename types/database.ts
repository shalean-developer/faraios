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
  status: string | null;
  created_at?: string;
};
