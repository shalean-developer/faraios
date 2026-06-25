"use server";

import { revalidatePath } from "next/cache";

import { cancelV7Subscription } from "@/lib/billing/v7-records";
import { companyBillingPath, companyDashboardPath } from "@/lib/paths/company";
import { requireCompanyOwner } from "@/lib/services/company-access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { SubscriptionMutationResult } from "@/app/actions/subscription";

export async function cancelWorkspaceSubscription(input: {
  companyId: string;
  companySlug: string;
}): Promise<SubscriptionMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const cancelResult = await cancelV7Subscription(input.companyId);
  if (!cancelResult.ok) {
    return cancelResult;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ subscription_status: "cancelled" })
    .eq("id", input.companyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(companyBillingPath(input.companySlug));
  revalidatePath(companyDashboardPath(input.companySlug));
  return { ok: true };
}
