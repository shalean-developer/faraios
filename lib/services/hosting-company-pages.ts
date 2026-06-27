import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getCompanyHostingOverview } from "@/lib/services/hosting-automation";
import { getHostingSubscriptionForCompany } from "@/lib/services/hosting";
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
