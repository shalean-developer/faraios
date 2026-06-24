"use server";

import { revalidatePath } from "next/cache";

import { confirmWorkspacePaymentFromReference } from "@/lib/billing/workspace-subscription-payment";
import { requireCompanyOwner } from "@/lib/services/company-access";
import { companySubscriptionPath } from "@/lib/paths/company";

export type ConfirmPaymentResult =
  | { ok: true; activated: boolean }
  | { ok: false; error: string };

export async function confirmWorkspacePaymentAction(input: {
  companyId: string;
  companySlug: string;
  reference: string;
}): Promise<ConfirmPaymentResult> {
  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const reference = input.reference.trim();
  if (!reference) {
    return { ok: false, error: "Enter your Paystack payment reference." };
  }

  const result = await confirmWorkspacePaymentFromReference({
    reference,
    companyId: input.companyId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(companySubscriptionPath(input.companySlug));
  revalidatePath(`/${input.companySlug}/dashboard`);

  return { ok: true, activated: !result.alreadyActive };
}
