import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { listSubscriptionPayments } from "@/lib/services/subscription";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { confirmWorkspacePaymentForUser } from "@/lib/services/workspace-subscription-verify";
import { createClient } from "@/lib/supabase/server";

import { CompanySubscriptionClient } from "./company-subscription-client";
import { SubscriptionPaymentRecovery } from "@/components/subscription/subscription-payment-recovery";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{
    payment?: string;
    reference?: string;
    trxref?: string;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workspace subscription — Shalean",
  robots: { index: false, follow: false },
};

export default async function CompanySubscriptionPage({ params, searchParams }: Props) {
  const { company } = await params;
  const { payment, reference, trxref } = await searchParams;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const paymentConfirmation = await confirmWorkspacePaymentForUser({
    reference: reference ?? trxref,
    companyId: row.id,
    companySlug: slug,
    userId: user.id,
    paymentSuccess: payment === "success",
  });

  const refreshedCompany =
    paymentConfirmation.status === "activated" ||
    paymentConfirmation.status === "already_active"
      ? ((await getCompanyBySlug(slug)) ?? row)
      : row;

  const payments = await listSubscriptionPayments(refreshedCompany.id);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Workspace subscription</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your Shalean platform plan and monthly billing.
        </p>
      </header>

      <SubscriptionPaymentRecovery
        slug={slug}
        companyId={refreshedCompany.id}
        paymentConfirmation={paymentConfirmation}
      />
      <CompanySubscriptionClient
        slug={slug}
        company={refreshedCompany}
        paymentConfirmation={paymentConfirmation}
        payments={payments}
        billingEmail={refreshedCompany.primary_contact_email ?? user.email ?? null}
      />
    </div>
  );
}
