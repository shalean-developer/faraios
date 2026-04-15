import {
  normalizePlanSlug,
  planLabelForSlug,
  type PricingPlanSlug,
} from "@/lib/data/pricing";
import { listMemberCompaniesWithIndustry } from "@/lib/services/companies";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";
import type { CompanyWithIndustry } from "@/types/database";
import type {
  CompanyBuildStatus,
  DashboardProjectRow,
  DashboardSnapshot,
} from "@/types/dashboard";

const PLAN_RANK: Record<PricingPlanSlug, number> = {
  starter: 0,
  business: 1,
  premium: 2,
};

function highestPlanLabel(companies: CompanyWithIndustry[]): string {
  if (companies.length === 0) {
    return "Not assigned";
  }
  let best: PricingPlanSlug = "starter";
  for (const c of companies) {
    const slug = normalizePlanSlug(c.plan);
    if (PLAN_RANK[slug] > PLAN_RANK[best]) {
      best = slug;
    }
  }
  return planLabelForSlug(best);
}

function formatCreatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapBuildStatus(raw: string | null | undefined): CompanyBuildStatus {
  if (
    raw === "in-progress" ||
    raw === "review" ||
    raw === "completed"
  ) {
    return raw;
  }
  return "pending";
}

/**
 * Server-side dashboard: auth user + public.users profile, memberships → companies,
 * derived plan tier, bookings count. Subscription renewal copy will use billing data when available.
 */
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!isSupabaseConfigured()) {
    return { authenticated: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authenticated: false };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const companies = await listMemberCompaniesWithIndustry(user.id);
  const totalProjects = companies.length;
  const activeSites = companies.filter((c) => c.is_published === true).length;

  const publishedCompany = companies.find((c) => c.is_published === true);
  const launchHref = publishedCompany
    ? `/${encodeURIComponent(publishedCompany.slug)}/dashboard`
    : null;

  const companyIds = companies.map((c) => c.id);
  let bookingsTotal = 0;
  if (companyIds.length > 0) {
    const { count, error } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("company_id", companyIds);
    if (!error) {
      bookingsTotal = count ?? 0;
    }
  }

  const projects: DashboardProjectRow[] = companies.map((row) => ({
    id: row.id,
    slug: row.slug,
    businessName: row.name,
    status: mapBuildStatus(row.build_status),
    createdDate: formatCreatedDate(row.created_at),
    industry: row.industries?.name ?? "—",
    isPublished: row.is_published === true,
  }));

  const email = user.email ?? null;
  const fullNameMeta =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const profileName = profile?.full_name?.trim() ?? "";
  const displayName =
    profileName || fullNameMeta || (email ? email.split("@")[0]! : "there");

  const planLabel = highestPlanLabel(companies);

  return {
    authenticated: true,
    user: {
      id: user.id,
      email,
      displayName,
    },
    subscription: {
      planName: planLabel,
      status: "active",
      renewsLabel: null,
    },
    metrics: {
      totalProjects,
      activeSites,
      bandwidthLabel: totalProjects > 0 ? "Included" : "—",
    },
    launchHref,
    projects,
    future: {
      bookings: { totalCount: bookingsTotal },
      payments: { state: "planned" },
      analytics: { state: "planned" },
    },
  };
}
