import { isMissingSortOrderColumn } from "@/lib/company-services/sort-order";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { Booking, CompanyService } from "@/types/database";

export type CompanyServiceStats = {
  bookingCount: number;
  revenueCents: number;
};

export async function listServicesForCompany(
  companyId: string,
  options?: { activeOnly?: boolean }
): Promise<CompanyService[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const supabase = await createClient();

  const runQuery = (useSortOrder: boolean) => {
    let query = supabase.from("company_services").select("*").eq("company_id", companyId);

    if (options?.activeOnly) {
      query = query.eq("active", true);
    }

    if (useSortOrder) {
      query = query.order("sort_order", { ascending: true }).order("name", { ascending: true });
    } else {
      query = query.order("name", { ascending: true });
    }

    return query;
  };

  let { data, error } = await runQuery(true);

  if (error && isMissingSortOrderColumn(error.message)) {
    ({ data, error } = await runQuery(false));
  }

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

export async function getServiceStatsForCompany(
  companyId: string
): Promise<Record<string, CompanyServiceStats>> {
  if (!isSupabaseConfigured() || !companyId) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("service_id, price_cents")
    .eq("company_id", companyId)
    .not("service_id", "is", null);

  if (error) {
    console.error("[services] getServiceStatsForCompany", error.message);
    return {};
  }

  const stats: Record<string, CompanyServiceStats> = {};

  for (const row of data ?? []) {
    const serviceId = row.service_id as string;
    if (!stats[serviceId]) {
      stats[serviceId] = { bookingCount: 0, revenueCents: 0 };
    }
    stats[serviceId].bookingCount += 1;
    stats[serviceId].revenueCents += row.price_cents ?? 0;
  }

  return stats;
}

export async function listBookingsForService(
  companyId: string,
  serviceId: string
): Promise<Booking[]> {
  if (!isSupabaseConfigured() || !companyId || !serviceId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("company_id", companyId)
    .eq("service_id", serviceId)
    .order("booking_date", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[services] listBookingsForService", error.message);
    return [];
  }

  return (data ?? []) as Booking[];
}

export async function countBookingsForService(
  companyId: string,
  serviceId: string
): Promise<number> {
  if (!isSupabaseConfigured() || !companyId || !serviceId) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("service_id", serviceId);

  if (error) {
    console.error("[services] countBookingsForService", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getNextServiceSortOrder(companyId: string): Promise<number> {
  if (!isSupabaseConfigured() || !companyId) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_services")
    .select("sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && isMissingSortOrderColumn(error.message)) {
    const { count } = await supabase
      .from("company_services")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);
    return count ?? 0;
  }

  if (error || data?.sort_order == null) return 0;
  return (data.sort_order as number) + 1;
}

export async function companyServicesSupportSortOrder(companyId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !companyId) return false;

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_services")
    .select("sort_order")
    .eq("company_id", companyId)
    .limit(1);

  return !isMissingSortOrderColumn(error?.message);
}
