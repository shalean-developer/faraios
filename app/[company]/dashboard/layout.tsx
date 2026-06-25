import { notFound } from "next/navigation";

import { CompanyWorkspaceShell } from "@/components/company/company-workspace-shell";
import { SubscriptionBanner } from "@/components/subscription/subscription-banner";
import { SubscriptionGate } from "@/components/subscription/subscription-gate";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listCompaniesForUser } from "@/lib/services/memberships";
import { getUserPermissionKeys } from "@/lib/services/permissions";
import { companyHasWebsiteProject } from "@/lib/services/projects";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

type Props = {
  children: React.ReactNode;
  params: Promise<{ company: string }>;
};

export default async function CompanyDashboardLayout({ children, params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const hasWebsiteProject = await companyHasWebsiteProject(row.id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const companies = user ? await listCompaniesForUser(user.id) : [];

  const userDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "Account");

  const userPermissions = user ? await getUserPermissionKeys(row.id, user.id) : [];

  const subscription: SubscriptionCompanyFields = {
    plan: row.plan,
    subscription_status: row.subscription_status,
    subscription_started_at: row.subscription_started_at,
    subscription_expires_at: row.subscription_expires_at,
    next_billing_date: row.next_billing_date,
    paystack_customer_code: row.paystack_customer_code,
    paystack_subscription_code: row.paystack_subscription_code,
  };

  return (
    <CompanyWorkspaceShell
      slug={slug}
      companyName={row.name}
      hasWebsiteProject={hasWebsiteProject}
      companies={companies}
      userDisplayName={userDisplayName}
      userEmail={user?.email ?? null}
      userPermissions={userPermissions}
      subscription={subscription}
      industrySlug={row.industries?.slug ?? null}
    >
      <SubscriptionBanner
        slug={slug}
        companyId={row.id}
        company={subscription}
        billingEmail={row.primary_contact_email ?? user?.email ?? null}
      />
      <SubscriptionGate
        slug={slug}
        companyId={row.id}
        company={subscription}
        billingEmail={row.primary_contact_email ?? user?.email ?? null}
      >
        {children}
      </SubscriptionGate>
    </CompanyWorkspaceShell>
  );
}
