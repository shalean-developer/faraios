import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { getMarketingAnalytics } from "@/lib/services/marketing-analytics";
import type { BiMetrics } from "@/types/v6-engine";

const empty: BiMetrics = {
  revenue: { todayCents: 0, weekCents: 0, monthCents: 0, yearCents: 0, growthPercent: 0 },
  bookings: { total: 0, completed: 0, cancelled: 0, conversionRate: 0 },
  customers: { new: 0, returning: 0, active: 0, churnRisk: 0 },
  marketing: { leads: 0, conversionRate: 0, topSources: [], campaignPerformance: [] },
  operations: {
    staffUtilization: 0,
    averageJobValueCents: 0,
    averageResponseHours: 0,
    completionRate: 0,
  },
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function getBiMetrics(companyId: string): Promise<BiMetrics> {
  if (!isSupabaseConfigured() || !companyId) return empty;

  const supabase = await createClient();
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = daysAgo(7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const ninetyDaysAgo = daysAgo(90);
  const thirtyDaysAgo = daysAgo(30);

  const [
    paymentsRes,
    bookingsRes,
    customersRes,
    membersRes,
    marketing,
    campaignsRes,
  ] = await Promise.all([
    supabase
      .from("customer_payments")
      .select("amount_cents, status, paid_at, created_at")
      .eq("company_id", companyId)
      .eq("status", "paid"),
    supabase
      .from("bookings")
      .select("id, status, price_cents, created_at, assigned_staff_id, updated_at")
      .eq("company_id", companyId),
    supabase
      .from("customers")
      .select("id, created_at")
      .eq("company_id", companyId),
    supabase.from("memberships").select("user_id").eq("company_id", companyId),
    getMarketingAnalytics(companyId),
    supabase
      .from("email_campaigns")
      .select("name, sent_count, click_count")
      .eq("company_id", companyId)
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(5),
  ]);

  const payments = paymentsRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const customers = customersRes.data ?? [];
  const memberCount = (membersRes.data ?? []).length || 1;

  if (paymentsRes.error) {
    console.error("[bi-metrics] customer_payments", paymentsRes.error.message);
  }
  if (bookingsRes.error) {
    console.error("[bi-metrics] bookings", bookingsRes.error.message);
  }
  if (customersRes.error) {
    console.error("[bi-metrics] customers", customersRes.error.message);
  }

  const sumInRange = (start: Date, end?: Date) =>
    payments
      .filter((p) => {
        const when = new Date(p.paid_at ?? p.created_at ?? "");
        return when >= start && (!end || when <= end);
      })
      .reduce((s, p) => s + p.amount_cents, 0);

  const todayCents = sumInRange(todayStart);
  const weekCents = sumInRange(weekStart);
  const monthCents = sumInRange(monthStart);
  const yearCents = sumInRange(yearStart);
  const lastMonthCents = sumInRange(lastMonthStart, lastMonthEnd);
  const growthPercent =
    lastMonthCents > 0
      ? Math.round(((monthCents - lastMonthCents) / lastMonthCents) * 100)
      : monthCents > 0
        ? 100
        : 0;

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
  const conversionRate =
    totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

  const newCustomers = customers.filter(
    (c) => new Date(c.created_at) >= thirtyDaysAgo
  ).length;

  const bookingsWithCustomer = await supabase
    .from("bookings")
    .select("customer_id, status, created_at")
    .eq("company_id", companyId)
    .not("customer_id", "is", null);

  const customerActivity = new Map<string, { count: number; lastBooking: Date }>();
  for (const b of bookingsWithCustomer.data ?? []) {
    if (!b.customer_id) continue;
    const existing = customerActivity.get(b.customer_id);
    const when = new Date(b.created_at);
    if (!existing) {
      customerActivity.set(b.customer_id, { count: 1, lastBooking: when });
    } else {
      existing.count += 1;
      if (when > existing.lastBooking) existing.lastBooking = when;
    }
  }

  let returning = 0;
  let active = 0;
  let churnRisk = 0;
  for (const [, activity] of customerActivity) {
    if (activity.count > 1) returning += 1;
    if (activity.lastBooking >= thirtyDaysAgo) active += 1;
    if (activity.lastBooking < ninetyDaysAgo) churnRisk += 1;
  }

  const assignedBookings = bookings.filter((b) => b.assigned_staff_id).length;
  const staffUtilization =
    memberCount > 0 && totalBookings > 0
      ? Math.min(100, Math.round((assignedBookings / totalBookings) * 100))
      : 0;

  const completedWithPrice = bookings.filter(
    (b) => b.status === "completed" && (b.price_cents ?? 0) > 0
  );
  const averageJobValueCents =
    completedWithPrice.length > 0
      ? Math.round(
          completedWithPrice.reduce((s, b) => s + (b.price_cents ?? 0), 0) /
            completedWithPrice.length
        )
      : 0;

  const responseTimes: number[] = [];
  for (const b of bookings) {
    const created = new Date(b.created_at);
    const updated = new Date(b.updated_at ?? b.created_at);
    const hours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (hours > 0 && hours < 720) responseTimes.push(hours);
  }
  const averageResponseHours =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  const completionRate =
    totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

  return {
    revenue: { todayCents, weekCents, monthCents, yearCents, growthPercent },
    bookings: {
      total: totalBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      conversionRate,
    },
    customers: {
      new: newCustomers,
      returning,
      active,
      churnRisk,
    },
    marketing: {
      leads: marketing.leads,
      conversionRate: marketing.conversionRate,
      topSources: marketing.topSources.slice(0, 5),
      campaignPerformance: (campaignsRes.data ?? []).map((c) => ({
        name: c.name,
        sent: c.sent_count ?? 0,
        clicks: c.click_count ?? 0,
      })),
    },
    operations: {
      staffUtilization,
      averageJobValueCents,
      averageResponseHours,
      completionRate,
    },
  };
}
