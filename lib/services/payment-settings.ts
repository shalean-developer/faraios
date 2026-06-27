import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { PaymentMethodSettingKey } from "@/lib/financial/payment-methods";
import type { DepositType } from "@/lib/financial/status";
import type { CompanyPaymentSettings } from "@/types/financial";

const DEFAULT_SETTINGS: Omit<
  CompanyPaymentSettings,
  "company_id" | "created_at" | "updated_at"
> = {
  default_deposit_type: "full",
  default_deposit_value: 100,
  eft_bank_name: null,
  eft_account_name: null,
  eft_account_number: null,
  eft_branch_code: null,
  eft_reference_prefix: null,
  paystack_enabled: true,
  payfast_enabled: false,
  yoco_enabled: false,
  ozow_enabled: false,
  peach_enabled: false,
  stripe_enabled: false,
  eft_enabled: true,
  cash_enabled: false,
};

function normalizeSettingsRow(
  companyId: string,
  data: Record<string, unknown> | null,
  now: string
): CompanyPaymentSettings {
  if (!data) {
    return {
      company_id: companyId,
      ...DEFAULT_SETTINGS,
      created_at: now,
      updated_at: now,
    };
  }

  return {
    company_id: companyId,
    default_deposit_type: (data.default_deposit_type as DepositType) ?? "full",
    default_deposit_value: Number(data.default_deposit_value ?? 100),
    eft_bank_name: (data.eft_bank_name as string | null) ?? null,
    eft_account_name: (data.eft_account_name as string | null) ?? null,
    eft_account_number: (data.eft_account_number as string | null) ?? null,
    eft_branch_code: (data.eft_branch_code as string | null) ?? null,
    eft_reference_prefix: (data.eft_reference_prefix as string | null) ?? null,
    paystack_enabled: data.paystack_enabled !== false,
    payfast_enabled: Boolean(data.payfast_enabled),
    yoco_enabled: Boolean(data.yoco_enabled),
    ozow_enabled: Boolean(data.ozow_enabled),
    peach_enabled: Boolean(data.peach_enabled),
    stripe_enabled: Boolean(data.stripe_enabled),
    eft_enabled: data.eft_enabled !== false,
    cash_enabled: Boolean(data.cash_enabled),
    created_at: (data.created_at as string) ?? now,
    updated_at: (data.updated_at as string) ?? now,
  };
}

export async function getPaymentSettingsForCompany(
  companyId: string
): Promise<CompanyPaymentSettings> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured() || !companyId) {
    return normalizeSettingsRow(companyId, null, now);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_payment_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[payment-settings] getPaymentSettingsForCompany", error.message);
  }

  return normalizeSettingsRow(companyId, data as Record<string, unknown> | null, now);
}

export async function upsertPaymentSettings(input: {
  companyId: string;
  defaultDepositType: DepositType;
  defaultDepositValue: number;
  eftBankName?: string;
  eftAccountName?: string;
  eftAccountNumber?: string;
  eftBranchCode?: string;
  eftReferencePrefix?: string;
  paymentMethods: Record<PaymentMethodSettingKey, boolean>;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("company_payment_settings").upsert(
    {
      company_id: input.companyId,
      default_deposit_type: input.defaultDepositType,
      default_deposit_value: input.defaultDepositValue,
      eft_bank_name: input.eftBankName?.trim() || null,
      eft_account_name: input.eftAccountName?.trim() || null,
      eft_account_number: input.eftAccountNumber?.trim() || null,
      eft_branch_code: input.eftBranchCode?.trim() || null,
      eft_reference_prefix: input.eftReferencePrefix?.trim() || null,
      paystack_enabled: input.paymentMethods.paystack_enabled,
      payfast_enabled: input.paymentMethods.payfast_enabled,
      yoco_enabled: input.paymentMethods.yoco_enabled,
      ozow_enabled: input.paymentMethods.ozow_enabled,
      peach_enabled: input.paymentMethods.peach_enabled,
      stripe_enabled: input.paymentMethods.stripe_enabled,
      eft_enabled: input.paymentMethods.eft_enabled,
      cash_enabled: input.paymentMethods.cash_enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) {
    console.error("[payment-settings] upsertPaymentSettings", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
