"use server";

import { revalidatePath } from "next/cache";

import type { PaymentMethodSettingKey } from "@/lib/financial/payment-methods";
import { requireCompanyPermission } from "@/lib/services/company-access";
import { upsertPaymentSettings } from "@/lib/services/payment-settings";
import type { DepositType } from "@/lib/financial/status";

export type PaymentSettingsActionResult = { ok: true } | { ok: false; error: string };

function revalidatePaymentSettingsPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/revenue/payment-settings`);
  revalidatePath(`/${slug}/dashboard/invoices`);
  revalidatePath(`/${slug}/dashboard/payments`);
  revalidatePath(`/${slug}/dashboard/revenue`);
}

export async function updatePaymentSettingsAction(input: {
  companyId: string;
  companySlug: string;
  defaultDepositType: DepositType;
  defaultDepositValue: number;
  eftBankName?: string;
  eftAccountName?: string;
  eftAccountNumber?: string;
  eftBranchCode?: string;
  eftReferencePrefix?: string;
  paymentMethods: Record<PaymentMethodSettingKey, boolean>;
}): Promise<PaymentSettingsActionResult> {
  const access = await requireCompanyPermission(input.companyId, "manage_settings");
  if (!access.ok) return access;

  if (input.defaultDepositValue < 0) {
    return { ok: false, error: "Deposit value cannot be negative." };
  }

  const enabledCount = Object.values(input.paymentMethods).filter(Boolean).length;
  if (enabledCount === 0) {
    return { ok: false, error: "Enable at least one payment method." };
  }

  const result = await upsertPaymentSettings({
    companyId: input.companyId,
    defaultDepositType: input.defaultDepositType,
    defaultDepositValue: input.defaultDepositValue,
    eftBankName: input.eftBankName,
    eftAccountName: input.eftAccountName,
    eftAccountNumber: input.eftAccountNumber,
    eftBranchCode: input.eftBranchCode,
    eftReferencePrefix: input.eftReferencePrefix,
    paymentMethods: input.paymentMethods,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not save payment settings." };
  }

  revalidatePaymentSettingsPaths(input.companySlug);
  return { ok: true };
}
