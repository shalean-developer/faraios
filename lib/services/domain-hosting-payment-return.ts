import { redirect } from "next/navigation";

import { completeDomainHostingAfterPayment } from "@/lib/services/domain-hosting-purchase-complete";
import {
  companyWebsiteBuilderSectionPath,
  companyWebsiteDomainsPath,
} from "@/lib/paths/company";

type PaymentSearchParams = {
  payment?: string;
  domain?: string;
  reference?: string;
  trxref?: string;
};

export async function handleDomainHostingPaymentReturn(input: {
  searchParams: PaymentSearchParams;
  companyId: string;
  companySlug: string;
  userId: string;
  websiteId?: string | null;
  returnPath: string;
}): Promise<void> {
  const { searchParams } = input;
  if (searchParams.payment !== "success" || !searchParams.domain?.trim()) {
    return;
  }

  const domain = searchParams.domain.trim();
  const reference = searchParams.reference ?? searchParams.trxref ?? null;

  const result = await completeDomainHostingAfterPayment({
    companyId: input.companyId,
    companySlug: input.companySlug,
    domain,
    reference,
    userId: input.userId,
    websiteId: input.websiteId,
  });

  const encodedDomain = encodeURIComponent(domain);

  if (result.ok) {
    redirect(`${input.returnPath}?hosting_connected=1&domain=${encodedDomain}`);
  }

  if (result.stillProvisioning) {
    redirect(`${input.returnPath}?hosting_provisioning=1&domain=${encodedDomain}`);
  }

  redirect(
    `${input.returnPath}?hosting_error=1&domain=${encodedDomain}&message=${encodeURIComponent(result.error)}`
  );
}

export function domainHostingReturnPathForBuilder(slug: string): string {
  return companyWebsiteBuilderSectionPath(slug, "domains");
}

export function domainHostingReturnPathForDomainsPage(slug: string): string {
  return companyWebsiteDomainsPath(slug);
}
