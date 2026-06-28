import { notFound, redirect } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getBillingOverview } from "@/lib/services/billing";
import {
  getHostingSubscriptionForCompany,
  listHostingPaymentsForCompany,
} from "@/lib/services/hosting";
import { confirmHostingPaymentForUser } from "@/lib/services/hosting-subscription-verify";
import {
  ensureHostingDomainProvisioned,
  getHostingDomainContext,
} from "@/lib/services/hosting-domain";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { confirmWorkspacePaymentForUser } from "@/lib/services/workspace-subscription-verify";
import { getWorkspaceSetupFeeEnabled } from "@/lib/billing/platform-billing-settings";
import { companyDashboardPath, type CompanyBillingTab } from "@/lib/paths/company";
import { getCompanyHostingOverview, listActiveHostingPlans } from "@/lib/services/hosting-automation";
import { loadWebsiteDomainDnsHelp } from "@/lib/hosting/website-domain-dns-help";
import { createClient } from "@/lib/supabase/server";

import { CompanyBillingClient } from "./company-billing-client";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{
    tab?: string;
    plan?: string;
    payment?: string;
    reference?: string;
    trxref?: string;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billing — FaraiOS",
  robots: { index: false, follow: false },
};

const BILLING_TABS = new Set<CompanyBillingTab>([
  "subscription",
  "plans",
  "payments",
  "hosting",
]);

function parseBillingTab(value: string | undefined): CompanyBillingTab {
  if (value && BILLING_TABS.has(value as CompanyBillingTab)) {
    return value as CompanyBillingTab;
  }
  return "subscription";
}

export default async function CompanyBillingPage({ params, searchParams }: Props) {
  const { company } = await params;
  const { tab, plan, payment, reference, trxref } = await searchParams;
  const slug = decodeURIComponent(company);
  const initialTab = parseBillingTab(tab);
  const paymentReference = reference ?? trxref;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const isHostingFlow = initialTab === "hosting" || Boolean(plan);

  const [workspacePaymentConfirmation, hostingPaymentConfirmation] = await Promise.all([
    isHostingFlow
      ? Promise.resolve({ status: "none" as const })
      : confirmWorkspacePaymentForUser({
          reference: paymentReference,
          companyId: row.id,
          companySlug: slug,
          userId: user.id,
          paymentSuccess: payment === "success",
        }),
    isHostingFlow
      ? confirmHostingPaymentForUser({
          reference: paymentReference,
          companyId: row.id,
          companySlug: slug,
          userId: user.id,
          paymentSuccess: payment === "success",
        })
      : Promise.resolve({ status: "none" as const }),
  ]);

  const refreshedCompany =
    workspacePaymentConfirmation.status === "activated" ||
    workspacePaymentConfirmation.status === "already_active"
      ? ((await getCompanyBySlug(slug)) ?? row)
      : row;

  if (
    workspacePaymentConfirmation.status === "activated" ||
    workspacePaymentConfirmation.status === "already_active"
  ) {
    redirect(companyDashboardPath(slug));
  }

  const billing = await getBillingOverview(refreshedCompany.id, refreshedCompany);
  const workspaceSetupFeeEnabled = await getWorkspaceSetupFeeEnabled();

  const subscription = await getHostingSubscriptionForCompany(row.id);
  const hostingPayments = await listHostingPaymentsForCompany(row.id);

  if (
    subscription?.status === "active" &&
    subscription.custom_domain &&
    subscription.domain_status !== "none"
  ) {
    try {
      await ensureHostingDomainProvisioned(row.id, subscription.custom_domain);
    } catch (error) {
      console.error("[billing] ensureHostingDomainProvisioned", error);
    }
  }

  const hostingDomainContext = subscription?.custom_domain
    ? await getHostingDomainContext(row.id, subscription.custom_domain)
    : { domain: null, dnsRecords: [] };

  const hostingOverview = await getCompanyHostingOverview(row.id);
  const automationPlans = await listActiveHostingPlans();
  const domainDnsHelp = await loadWebsiteDomainDnsHelp(row.id);

  return (
    <CompanyBillingClient
      slug={slug}
      company={refreshedCompany}
      initialTab={initialTab}
      paymentConfirmation={workspacePaymentConfirmation}
      billing={billing}
      billingEmail={refreshedCompany.primary_contact_email ?? user.email ?? null}
      workspaceSetupFeeEnabled={workspaceSetupFeeEnabled}
      hosting={{
        subscription,
        payments: hostingPayments,
        initialPlan: plan,
        paymentConfirmation: hostingPaymentConfirmation,
        hostingDomain: hostingDomainContext.domain,
        dnsRecords: hostingDomainContext.dnsRecords,
        domainDnsHelp,
        automationServices: hostingOverview.services,
        automationInvoices: hostingOverview.invoices,
        automationPlans,
      }}
    />
  );
}
