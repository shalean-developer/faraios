import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
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
import { createClient } from "@/lib/supabase/server";

import { CompanyHostingClient } from "./company-hosting-client";
import { HostingPaymentRecovery } from "@/components/hosting/hosting-payment-recovery";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{
    plan?: string;
    payment?: string;
    reference?: string;
    trxref?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CompanyHostingPage({ params, searchParams }: Props) {
  const { company } = await params;
  const { plan, payment, reference, trxref } = await searchParams;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  if (!(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const paymentConfirmation = await confirmHostingPaymentForUser({
    reference: reference ?? trxref,
    companyId: row.id,
    companySlug: slug,
    userId: user.id,
    paymentSuccess: payment === "success",
  });

  const subscription = await getHostingSubscriptionForCompany(row.id);
  const payments = await listHostingPaymentsForCompany(row.id);

  if (
    subscription?.status === "active" &&
    subscription.custom_domain &&
    subscription.domain_status !== "none"
  ) {
    try {
      await ensureHostingDomainProvisioned(row.id, subscription.custom_domain);
    } catch (error) {
      console.error("[hosting] ensureHostingDomainProvisioned", error);
    }
  }

  const hostingDomainContext = subscription?.custom_domain
    ? await getHostingDomainContext(row.id, subscription.custom_domain)
    : { domain: null, dnsRecords: [] };

  return (
    <>
      <HostingPaymentRecovery
        slug={slug}
        companyId={row.id}
        paymentConfirmation={paymentConfirmation}
      />
      <CompanyHostingClient
        slug={slug}
        company={row}
        subscription={subscription}
        payments={payments}
        initialPlan={plan}
        paymentConfirmation={paymentConfirmation}
        billingEmail={row.primary_contact_email ?? user.email ?? null}
        hostingDomain={hostingDomainContext.domain}
        dnsRecords={hostingDomainContext.dnsRecords}
      />
    </>
  );
}
