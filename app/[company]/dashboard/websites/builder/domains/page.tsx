import { createClient } from "@/lib/supabase/server";
import { getCompanyBySlug } from "@/lib/services/companies";
import { parseDomainPurchaseNotice } from "@/lib/services/domain-purchase-notice";
import {
  domainHostingReturnPathForBuilder,
  handleDomainHostingPaymentReturn,
} from "@/lib/services/domain-hosting-payment-return";
import { getBuilderWebsiteForCompany } from "@/lib/website-builder/service";

import { loadWebsiteBuilderPage, renderWebsiteBuilderPage } from "../load-page";

export const metadata = {
  title: "Domains — Website builder",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{
    payment?: string;
    domain?: string;
    reference?: string;
    trxref?: string;
    hosting_connected?: string;
    hosting_provisioning?: string;
    hosting_error?: string;
    message?: string;
  }>;
};

export default async function WebsiteBuilderDomainsPage({ params, searchParams }: Props) {
  const { company } = await params;
  const sp = await searchParams;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const row = await getCompanyBySlug(slug);
    if (row) {
      const website = await getBuilderWebsiteForCompany(row.id);
      await handleDomainHostingPaymentReturn({
        searchParams: sp,
        companyId: row.id,
        companySlug: slug,
        userId: user.id,
        websiteId: website?.id ?? null,
        returnPath: domainHostingReturnPathForBuilder(slug),
      });
    }
  }

  const domainPurchaseNotice = parseDomainPurchaseNotice(sp);
  const data = await loadWebsiteBuilderPage(slug, "domains");
  return renderWebsiteBuilderPage(data, domainPurchaseNotice);
}
