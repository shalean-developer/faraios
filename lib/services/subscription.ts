import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type SubscriptionPaymentRecord = {
  id: string;
  company_id: string;
  plan_slug: string;
  amount_cents: number;
  currency: string;
  paystack_reference: string | null;
  status: string;
  paid_at: string;
  created_at: string;
};

export async function listSubscriptionPayments(
  companyId: string
): Promise<SubscriptionPaymentRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("company_id", companyId)
    .order("paid_at", { ascending: false })
    .limit(20);

  if (error) {
    const missingTable =
      error.code === "PGRST205" ||
      error.message.includes("subscription_payments") ||
      error.message.includes("schema cache");
    if (!missingTable) {
      console.error("[subscription] listSubscriptionPayments", error.message);
    }
    return [];
  }

  return (data ?? []) as SubscriptionPaymentRecord[];
}
