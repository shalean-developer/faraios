"use server";

import { requireCompanyPermission } from "@/lib/services/company-access";
import { getSegmentCustomers } from "@/lib/services/customer-segments";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export async function getSegmentCustomersAction(input: {
  companyId: string;
  segmentType: string;
  criteria: Record<string, unknown>;
}): Promise<
  | { ok: true; customers: { id: string; name: string; email: string | null }[] }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyPermission(input.companyId, "view_customers");
  if (!access.ok) return access;

  const customers = await getSegmentCustomers(
    input.companyId,
    input.segmentType,
    input.criteria
  );

  return { ok: true, customers };
}
