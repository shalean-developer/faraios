"use server";

import { revalidatePath } from "next/cache";

import { confirmHostingPaymentFromReference } from "@/lib/billing/hosting-subscription-payment";
import { requireCompanyOwner } from "@/lib/services/company-access";
import { companyHostingPath } from "@/lib/paths/company";

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

  const reference = input.reference.trim();
  if (!reference) {
    return { ok: false, error: "Enter your Paystack payment reference." };
  }

  const result = await confirmHostingPaymentFromReference({
    reference,
    companyId: input.companyId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(companyHostingPath(input.companySlug));
  revalidatePath(`/${input.companySlug}/dashboard`);

  return { ok: true, activated: !result.alreadyActive };
}
