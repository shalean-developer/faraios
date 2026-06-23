import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { CompanyService } from "@/types/database";

export async function listServicesForCompany(
  companyId: string,
  options?: { activeOnly?: boolean }
): Promise<CompanyService[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const supabase = await createClient();
  let query = supabase
    .from("company_services")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[services] listServicesForCompany", error.message);
    return [];
  }

  return (data ?? []) as CompanyService[];
}

export async function getServiceById(
  companyId: string,
  serviceId: string
): Promise<CompanyService | null> {
  if (!isSupabaseConfigured() || !companyId || !serviceId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_services")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    console.error("[services] getServiceById", error.message);
    return null;
  }

  return data as CompanyService | null;
}

export async function findServiceByName(
  companyId: string,
  name: string
): Promise<CompanyService | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_services")
    .select("*")
    .eq("company_id", companyId)
    .ilike("name", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[services] findServiceByName", error.message);
    return null;
  }

  return data as CompanyService | null;
}
