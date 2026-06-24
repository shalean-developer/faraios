import { countCustomersForCompany } from "@/lib/services/customers";
import { getRevenueMetrics } from "@/lib/services/revenue-metrics";
import type {
  OperationsMetrics,
  RecentActivityItem,
} from "@/lib/operations/metrics";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { Booking } from "@/types/database";

export type { OperationsMetrics, RecentActivityItem } from "@/lib/operations/metrics";
export {
  formatPriceInput,
  formatRevenue,
  parsePriceToCents,
} from "@/lib/operations/metrics";

export async function getOperationsMetrics(
  companyId: string
): Promise<OperationsMetrics> {
  const empty: OperationsMetrics = {
    totalBookings: 0,
    pendingBookings: 0,
    customers: 0,
    revenueCents: 0,
  };

  if (!isSupabaseConfigured() || !companyId) return empty;

  const supabase = await createClient();

  const [bookingsRes, customersCount, revenue] = await Promise.all([
    supabase
      .from("bookings")
      .select("status, price_cents")
      .eq("company_id", companyId),
    countCustomersForCompany(companyId),
    getRevenueMetrics(companyId),
  ]);

  if (bookingsRes.error) {
    console.error("[operations] getOperationsMetrics", bookingsRes.error.message);
    return empty;
  }

  const rows = bookingsRes.data ?? [];
  const totalBookings = rows.length;
  const pendingBookings = rows.filter((r) => r.status === "pending").length;

  return {
    totalBookings,
    pendingBookings,
    customers: customersCount,
    revenueCents: revenue.revenueMonthCents,
  };
}

export async function getRecentActivity(
  companyId: string,
  limit = 10
): Promise<RecentActivityItem[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_name, service, status, created_at, booking_date")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[operations] getRecentActivity", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const booking = row as Booking;
    const when = booking.created_at ?? booking.booking_date ?? "";
    return {
      id: booking.id,
      type: "booking" as const,
      title: booking.customer_name
        ? `Booking — ${booking.customer_name}`
        : "New booking",
      subtitle: booking.service ?? "Service not specified",
      status: booking.status,
      createdAt: when,
    };
  });
}
