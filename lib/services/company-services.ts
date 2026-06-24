import { aggregateServicePaymentStats } from "@/lib/financial/payment-revenue";
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
  const [bookingsRes, paymentsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, service_id")
      .eq("company_id", companyId)
      .not("service_id", "is", null),
    supabase
      .from("customer_payments")
      .select("amount_cents, status, booking_id")
      .eq("company_id", companyId),
  ]);

  if (bookingsRes.error) {
    console.error("[services] getServiceStatsForCompany bookings", bookingsRes.error.message);
    return {};
  }
  if (paymentsRes.error) {
    console.error("[services] getServiceStatsForCompany payments", paymentsRes.error.message);
    return {};
  }

  return aggregateServicePaymentStats(
    (bookingsRes.data ?? []) as { id: string; service_id: string | null }[],
    (paymentsRes.data ?? []) as {
      amount_cents: number;
      status: string;
      booking_id: string | null;
    }[]
  );
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
