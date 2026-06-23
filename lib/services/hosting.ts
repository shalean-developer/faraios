import { getHostingPlan } from "@/lib/data/hosting";
import { slugifyBusinessName } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import type {
  HostingPayment,
  HostingSubscription,
} from "@/types/database";

const SUBSCRIPTION_SELECT =
  "id, company_id, plan_slug, status, subdomain, custom_domain, domain_status, ssl_status, bandwidth_limit_gb, sites_limit, next_billing_date, activated_at, created_at, updated_at";

export async function getHostingSubscriptionForCompany(
  companyId: string
): Promise<HostingSubscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hosting_subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[hosting] get subscription failed", error.message);
    return null;
  }
  return data as HostingSubscription | null;
}

export async function listHostingPaymentsForCompany(
  companyId: string
): Promise<HostingPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hosting_payments")
    .select(
      "id, subscription_id, company_id, plan_slug, amount_cents, currency, paystack_reference, status, paid_at, created_at"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[hosting] list payments failed", error.message);
    return [];
  }
  return (data ?? []) as HostingPayment[];
}

/** Generate a unique subdomain from company slug/name. */
export function deriveHostingSubdomain(companySlug: string): string {
  return slugifyBusinessName(companySlug).slice(0, 48);
}

export function hostingPlanEntitlements(planSlug: string) {
  const plan = getHostingPlan(planSlug);
  return {
    sites_limit: plan.sites_limit,
    bandwidth_limit_gb: plan.bandwidth_limit_gb,
  };
}
