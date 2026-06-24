import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
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
  eft_enabled: true,
};

export async function getPaymentSettingsForCompany(
  companyId: string
): Promise<CompanyPaymentSettings> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured() || !companyId) {
    return {
      company_id: companyId,
      ...DEFAULT_SETTINGS,
      created_at: now,
      updated_at: now,
    };
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

  if (!data) {
    return {
      company_id: companyId,
      ...DEFAULT_SETTINGS,
      created_at: now,
      updated_at: now,
    };
  }

  return data as CompanyPaymentSettings;
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
  paystackEnabled: boolean;
  eftEnabled: boolean;
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
      paystack_enabled: input.paystackEnabled,
      eft_enabled: input.eftEnabled,
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
