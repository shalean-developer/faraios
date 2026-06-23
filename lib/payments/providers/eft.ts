import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { InitializePaymentInput, InitializePaymentResult } from "@/lib/payments/providers/types";

export async function initializeEftPayment(
  input: InitializePaymentInput
): Promise<InitializePaymentResult> {
  const admin = tryCreateAdminClient();
  const supabase = admin.ok ? admin.client : await createClient();
  const { data: settings } = await supabase
    .from("company_payment_settings")
    .select("*")
    .eq("company_id", input.companyId)
    .maybeSingle();

  const prefix = settings?.eft_reference_prefix ?? "INV";
  const reference = `${prefix}-${input.paymentId.slice(0, 8).toUpperCase()}`;

  const lines: string[] = [
    "Please make an EFT/bank transfer with the following details:",
    "",
  ];

  if (settings?.eft_bank_name) lines.push(`Bank: ${settings.eft_bank_name}`);
  if (settings?.eft_account_name) lines.push(`Account name: ${settings.eft_account_name}`);
  if (settings?.eft_account_number) lines.push(`Account number: ${settings.eft_account_number}`);
  if (settings?.eft_branch_code) lines.push(`Branch code: ${settings.eft_branch_code}`);
  lines.push(`Reference: ${reference}`);
  lines.push(
    `Amount: R${(input.amountCents / 100).toFixed(2)}`,
    "",
    "Your payment will be confirmed once we receive and verify the transfer."
  );

  return {
    ok: true,
    reference,
    instructions: lines.join("\n"),
  };
}
