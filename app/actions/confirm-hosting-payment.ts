"use server";

import { revalidatePath } from "next/cache";

import { confirmAnyHostingPaymentFromReference } from "@/lib/billing/hosting-payment-confirm";
import { parsePaystackPaymentReference } from "@/lib/billing/paystack";
import { requireCompanyOwner } from "@/lib/services/company-access";
import {
  companyHostingPath,
  companyHostingInvoicesPath,
  companyHostingServicesPath,
} from "@/lib/paths/company";

export type ConfirmHostingPaymentResult =
  | { ok: true; activated: boolean }
  | { ok: false; error: string };

export async function confirmHostingPaymentAction(input: {
  companyId: string;
  companySlug: string;
  reference: string;
}): Promise<ConfirmHostingPaymentResult> {
  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const reference = parsePaystackPaymentReference(input.reference);
  if (!reference) {
    return {
      ok: false,
      error:
        "Could not find a Paystack reference. Paste the reference only (e.g. plkv6ima1c) or your full return URL.",
    };
  }

  const result = await confirmAnyHostingPaymentFromReference({
    reference,
    companyId: input.companyId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(companyHostingPath(input.companySlug));
  revalidatePath(companyHostingServicesPath(input.companySlug));
  revalidatePath(companyHostingInvoicesPath(input.companySlug));
  revalidatePath(`/${input.companySlug}/dashboard`);

  return { ok: true, activated: !result.alreadyActive };
}
