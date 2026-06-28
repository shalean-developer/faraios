import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getCompanyHostingOverview } from "@/lib/services/hosting-automation";
import { getHostingSubscriptionForCompany } from "@/lib/services/hosting";
import {
  confirmHostingPaymentForUser,
  type HostingPaymentConfirmationState,
} from "@/lib/services/hosting-subscription-verify";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";
import type { CompanyWithIndustry } from "@/types/database";
import type {
  HostingInvoiceRow,
  HostingServiceRow,
  HostingSupportTicketRow,
} from "@/types/hosting-automation";

export type CompanyHostingPageContext = {
  slug: string;
  company: CompanyWithIndustry;
  overview: {
    services: HostingServiceRow[];
    invoices: HostingInvoiceRow[];
    tickets: HostingSupportTicketRow[];
  };
  hasLegacySubscription: boolean;
};

export async function loadCompanyHostingPage(
  companyParam: string
): Promise<CompanyHostingPageContext> {
  const slug = decodeURIComponent(companyParam);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const [overview, legacySubscription] = await Promise.all([
    getCompanyHostingOverview(row.id),
    getHostingSubscriptionForCompany(row.id),
  ]);

  return {
    slug,
    company: row,
    overview: {
      services: overview.services,
      invoices: overview.invoices,
      tickets: (overview.tickets ?? []) as HostingSupportTicketRow[],
    },
    hasLegacySubscription: legacySubscription?.status === "active",
  };
}

type HostingPaymentQuery = {
  payment?: string;
  reference?: string;
  trxref?: string;
};

export async function loadCompanyHostingPageWithPaymentConfirmation(
  companyParam: string,
  query: HostingPaymentQuery = {}
): Promise<
  CompanyHostingPageContext & {
    paymentConfirmation: HostingPaymentConfirmationState;
  }
> {
  const context = await loadCompanyHostingPage(companyParam);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const paymentConfirmation = user
    ? await confirmHostingPaymentForUser({
        reference: query.reference ?? query.trxref,
        companyId: context.company.id,
        companySlug: context.slug,
        userId: user.id,
        paymentSuccess: query.payment === "success",
      })
    : { status: "none" as const };

  if (paymentConfirmation.status === "activated") {
    const refreshed = await getCompanyHostingOverview(context.company.id);
    context.overview = {
      services: refreshed.services,
      invoices: refreshed.invoices,
      tickets: (refreshed.tickets ?? []) as HostingSupportTicketRow[],
    };
  }

  return { ...context, paymentConfirmation };
}
