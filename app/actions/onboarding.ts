"use server";

import { revalidatePath } from "next/cache";

import { createBusinessSystem } from "@/lib/services/onboarding";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type OnboardingSubmitInput = {
  businessName: string;
  industryId: string;
  onboardingData?: {
    pages?: string[];
    features?: string[];
    style?: string | null;
    competitors?: string | null;
  };
  /** From `/get-started?plan=` — starter | business | premium */
  plan?: string | null;
  /** Must match signed-in user (validated server-side). */
  userId?: string | null;
};

export type CreateCompanyResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/**
 * Creates company, membership, project, and default activities (see `createBusinessSystem`).
 */
export async function createCompanyFromOnboarding(
  input: OnboardingSubmitInput
): Promise<CreateCompanyResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
    };
  }

  const result = await createBusinessSystem({
    businessName: input.businessName,
    industryId: input.industryId,
    onboardingData: input.onboardingData,
    plan: input.plan,
    userId: input.userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const { slug } = result.data.company;
  const company = result.data.company;
  const membership = result.data.membership;

  if (!company?.id || !membership?.id) {
    throw new Error("Onboarding failed");
  }

  revalidatePath("/");
  revalidatePath("/app");
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/project`);

  return { ok: true, slug };
}
