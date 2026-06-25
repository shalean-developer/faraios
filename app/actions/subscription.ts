"use server";

import { revalidatePath } from "next/cache";

import { normalizePlanSlug, type PricingPlanSlug } from "@/lib/data/pricing";
import { requireCompanyOwner } from "@/lib/services/company-access";
import { companyBillingPath, companySubscriptionPath } from "@/lib/paths/company";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type SubscriptionMutationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function changeWorkspacePlan(input: {
  companyId: string;
  companySlug: string;
  plan: string;
}): Promise<SubscriptionMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const plan = normalizePlanSlug(input.plan);

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ plan })
    .eq("id", input.companyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(companyBillingPath(input.companySlug));
  revalidatePath(companySubscriptionPath(input.companySlug));
  revalidatePath(`/${input.companySlug}/dashboard`);
  return { ok: true };
}

export async function updateWorkspacePlanSelection(input: {
  companyId: string;
  companySlug: string;
  plan: PricingPlanSlug;
}): Promise<SubscriptionMutationResult> {
  return changeWorkspacePlan(input);
}
