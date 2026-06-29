import { revalidatePath } from "next/cache";

import { confirmAnyHostingPaymentFromReference } from "@/lib/billing/hosting-payment-confirm";
import { parsePaystackPaymentReference } from "@/lib/billing/paystack";
import { provisionCompanyWebsiteDomain } from "@/lib/services/hosting-domain";
import { getDomainHostingReadiness } from "@/lib/services/domain-hosting-readiness";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { normalizeDomain } from "@/lib/services/website-domains";
import {
  getBuilderWebsiteForCompany,
  syncDomainSettingsCustomDomain,
} from "@/lib/website-builder/service";
import {
  companyWebsiteBuilderSectionPath,
  companyWebsiteDomainsPath,
} from "@/lib/paths/company";

const PROVISION_RETRY_ATTEMPTS = 12;
const PROVISION_RETRY_DELAY_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CompleteDomainHostingPurchaseResult =
  | { ok: true; message: string; alreadyConnected?: boolean }
  | { ok: false; error: string; stillProvisioning?: boolean };

export async function completeDomainHostingAfterPayment(input: {
  companyId: string;
  companySlug: string;
  domain: string;
  reference?: string | null;
  userId: string;
  websiteId?: string | null;
}): Promise<CompleteDomainHostingPurchaseResult> {
  const hasAccess = await userHasCompanySlugAccess(input.userId, input.companySlug);
  if (!hasAccess) {
    return { ok: false, error: "You do not have access to this workspace." };
  }

  const normalized = normalizeDomain(input.domain);
  if (!normalized || !normalized.includes(".")) {
    return { ok: false, error: "Enter a valid domain." };
  }

  const reference = input.reference?.trim()
    ? parsePaystackPaymentReference(input.reference.trim())
    : null;

  if (reference) {
    const payment = await confirmAnyHostingPaymentFromReference({
      reference,
      companyId: input.companyId,
    });
    if (!payment.ok) {
      console.warn(
        "[domain-hosting-purchase] payment confirmation",
        normalized,
        payment.error
      );
    }
  }

  for (let attempt = 0; attempt < PROVISION_RETRY_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(PROVISION_RETRY_DELAY_MS);
    }

    const readiness = await getDomainHostingReadiness(input.companyId, normalized);
    if (!readiness.ready) {
      continue;
    }

    const provision = await provisionCompanyWebsiteDomain({
      companyId: input.companyId,
      domain: normalized,
      hostingProvider: "plesk",
      websiteId: input.websiteId,
      isPrimary: true,
      serverId: readiness.serverId,
      pleskSubscriptionId: readiness.pleskSubscriptionId,
    });

    if (!provision.ok) {
      return { ok: false, error: provision.error };
    }

    const builderWebsite =
      input.websiteId != null
        ? { id: input.websiteId }
        : await getBuilderWebsiteForCompany(input.companyId);

    if (builderWebsite) {
      await syncDomainSettingsCustomDomain({
        websiteId: builderWebsite.id,
        companyId: input.companyId,
        customDomain: normalized,
        customDomainStatus: "pending",
      });
    }

    revalidatePath(companyWebsiteDomainsPath(input.companySlug));
    revalidatePath(companyWebsiteBuilderSectionPath(input.companySlug, "domains"));
    revalidatePath(`/${input.companySlug}/dashboard`);

    return {
      ok: true,
      message:
        "Hosting is active and your domain is connected. Add the DNS records below — verification runs automatically.",
    };
  }

  const finalReadiness = await getDomainHostingReadiness(input.companyId, normalized);
  if (!finalReadiness.ready) {
    return {
      ok: false,
      error:
        "Your payment was received. Hosting is still being set up in Plesk — this usually takes under a minute.",
      stillProvisioning: true,
    };
  }

  return {
    ok: false,
    error: "Hosting is ready but the domain could not be connected. Refresh or contact support.",
  };
}
