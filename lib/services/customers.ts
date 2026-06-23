import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { Customer } from "@/types/database";

export async function listCustomersForCompany(
  companyId: string
): Promise<Customer[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[customers] listCustomersForCompany", error.message);
    return [];
  }

  return (data ?? []) as Customer[];
}

export async function getCustomerById(
  companyId: string,
  customerId: string
): Promise<Customer | null> {
  if (!isSupabaseConfigured() || !companyId || !customerId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    console.error("[customers] getCustomerById", error.message);
    return null;
  }

  return data as Customer | null;
}

export async function findCustomerByEmail(
  companyId: string,
  email: string
): Promise<Customer | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .ilike("email", normalized)
    .maybeSingle();

  if (error) {
    console.error("[customers] findCustomerByEmail", error.message);
    return null;
  }

  return data as Customer | null;
}

export async function countCustomersForCompany(
  companyId: string
): Promise<number> {
  if (!isSupabaseConfigured() || !companyId) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    console.error("[customers] countCustomersForCompany", error.message);
    return 0;
  }

  return count ?? 0;
}
