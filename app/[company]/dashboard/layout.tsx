import { notFound } from "next/navigation";

import { CompanyWorkspaceShell } from "@/components/company/company-workspace-shell";
import { PlatformWorkspaceProvider } from "@/components/platform/platform-workspace-context";
import { SubscriptionBanner } from "@/components/subscription/subscription-banner";
import { SubscriptionGate } from "@/components/subscription/subscription-gate";
import {
  getActivePlatformWorkspaceSessionForSlug,
  getPlatformWorkspacePermissions,
  touchPlatformWorkspaceSession,
} from "@/lib/platform/workspace-session";
import { getAdminSessionProfile } from "@/lib/services/admin";
import { getWorkspaceSetupFeeEnabled } from "@/lib/billing/platform-billing-settings";
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

  const platformWorkspaceSession = await getActivePlatformWorkspaceSessionForSlug(slug);
  const isPlatformWorkspace = Boolean(platformWorkspaceSession);

  if (platformWorkspaceSession) {
    await touchPlatformWorkspaceSession(platformWorkspaceSession.id);
  }

  const adminProfile = isPlatformWorkspace ? await getAdminSessionProfile() : null;
  const workspaceSetupFeeEnabled = await getWorkspaceSetupFeeEnabled();

  const userDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "Account");

  const membershipPermissions = user
    ? await getUserPermissionKeys(row.id, user.id)
    : [];
  const workspacePermissions = isPlatformWorkspace
    ? await getPlatformWorkspacePermissions(platformWorkspaceSession)
    : [];
  const userPermissions = isPlatformWorkspace
    ? workspacePermissions
    : membershipPermissions;

  const subscription: SubscriptionCompanyFields = {
    plan: row.plan,
    subscription_status: row.subscription_status,
    subscription_started_at: row.subscription_started_at,
    subscription_expires_at: row.subscription_expires_at,
    next_billing_date: row.next_billing_date,
    setup_fee_waived: row.setup_fee_waived,
    setup_fee_paid_at: row.setup_fee_paid_at,
    paystack_customer_code: row.paystack_customer_code,
    paystack_subscription_code: row.paystack_subscription_code,
  };

  const workspaceContextValue = {
    active: isPlatformWorkspace,
    session: platformWorkspaceSession,
    adminDisplayName: adminProfile?.adminDisplayName ?? "Platform Administrator",
    businessPermissions: userPermissions,
  };

  return (
    <PlatformWorkspaceProvider value={workspaceContextValue}>
      <CompanyWorkspaceShell
        slug={slug}
        companyName={row.name}
        hasWebsiteProject={hasWebsiteProject}
        companies={isPlatformWorkspace ? [] : companies}
        userDisplayName={
          isPlatformWorkspace
            ? (adminProfile?.adminDisplayName ?? "Platform Administrator")
            : userDisplayName
        }
        userEmail={user?.email ?? null}
        userPermissions={userPermissions}
        subscription={subscription}
        industrySlug={row.industries?.slug ?? null}
        platformWorkspaceMode={isPlatformWorkspace}
      >
        <SubscriptionBanner
          slug={slug}
          companyId={row.id}
          company={subscription}
          billingEmail={row.primary_contact_email ?? user?.email ?? null}
          workspaceSetupFeeEnabled={workspaceSetupFeeEnabled}
          bypass={isPlatformWorkspace}
        />
        <SubscriptionGate
          slug={slug}
          companyId={row.id}
          company={subscription}
          billingEmail={row.primary_contact_email ?? user?.email ?? null}
          workspaceSetupFeeEnabled={workspaceSetupFeeEnabled}
          bypass={isPlatformWorkspace}
        >
          {children}
        </SubscriptionGate>
      </CompanyWorkspaceShell>
    </PlatformWorkspaceProvider>
  );
}
