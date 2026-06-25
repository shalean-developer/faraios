import type {
  HomeActivityItem,
  HomeOverviewData,
  HomeOverviewInsight,
  UpcomingBookingItem,
} from "@/lib/operations/metrics";
import {
  activityLogSubtitle,
  activityLogTitle,
  activityServiceForCustomer,
  bookingActivityTitle,
  firstLineItemDescription,
  invoiceActivityTitle,
  leadActivitySubtitle,
  leadActivityTitle,
  paymentActivitySubtitle,
  paymentActivityTitle,
  quoteActivityTitle,
  reviewActivityTitle,
} from "@/lib/operations/home-activity-copy";
import { generateAiInsights } from "@/lib/services/ai-assistant";
import { listCompanyActivity } from "@/lib/services/activity-log";
import { getBusinessHealthScore } from "@/lib/services/business-health";
import { countCustomersForCompany } from "@/lib/services/customers";
import { getRevenueMetrics } from "@/lib/services/revenue-metrics";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { Booking } from "@/types/database";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function startOfYesterday(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}

function endOfYesterday(): Date {
  return startOfToday();
}

function startOfThisMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function isBookingToday(bookingDate: string | null | undefined): boolean {
  if (!bookingDate) return false;
  const when = new Date(bookingDate);
  if (Number.isNaN(when.getTime())) return false;
  return when >= startOfToday() && when < endOfToday();
}

function isBookingYesterday(bookingDate: string | null | undefined): boolean {
  if (!bookingDate) return false;
  const when = new Date(bookingDate);
  if (Number.isNaN(when.getTime())) return false;
  return when >= startOfYesterday() && when < endOfYesterday();
}

async function countBookingsToday(companyId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date")
    .eq("company_id", companyId);

  if (error) {
    console.error("[home-overview] countBookingsToday", error.message);
    return 0;
  }

  return (data ?? []).filter((row) => isBookingToday(row.booking_date)).length;
}

async function countBookingsYesterday(companyId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date")
    .eq("company_id", companyId);

  if (error) {
    console.error("[home-overview] countBookingsYesterday", error.message);
    return 0;
  }

  return (data ?? []).filter((row) => isBookingYesterday(row.booking_date)).length;
}

async function countPendingQuotes(companyId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", ["draft", "sent", "viewed"]);

  if (error) {
    console.error("[home-overview] countPendingQuotes", error.message);
    return 0;
  }
  return count ?? 0;
}

async function getInvoiceCounts(companyId: string): Promise<{
  outstanding: number;
  overdue: number;
}> {
  if (!isSupabaseConfigured()) return { outstanding: 0, overdue: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("status")
    .eq("company_id", companyId);

  if (error) {
    console.error("[home-overview] getInvoiceCounts", error.message);
    return { outstanding: 0, overdue: 0 };
  }

  const rows = data ?? [];
  return {
    outstanding: rows.filter((i) =>
      ["issued", "partially_paid"].includes(i.status)
    ).length,
    overdue: rows.filter((i) => i.status === "overdue").length,
  };
}

async function countNewLeads(companyId: string, days = 7): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", daysAgo(days).toISOString());

  if (error) {
    console.error("[home-overview] countNewLeads", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countQualifiedLeads(companyId: string, days = 7): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", daysAgo(days).toISOString())
    .in("status", ["contacted", "converted"]);

  if (error) {
    console.error("[home-overview] countQualifiedLeads", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countNewCustomersThisMonth(companyId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", startOfThisMonth().toISOString());

  if (error) {
    console.error("[home-overview] countNewCustomersThisMonth", error.message);
    return 0;
  }
  return count ?? 0;
}

async function getRevenueGrowthPercent(companyId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const now = new Date();
  const monthStart = startOfThisMonth();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const { data, error } = await supabase
    .from("customer_payments")
    .select("amount_cents, paid_at, created_at")
    .eq("company_id", companyId)
    .eq("status", "paid");

  if (error) {
    console.error("[home-overview] getRevenueGrowthPercent", error.message);
    return 0;
  }

  const sumInRange = (start: Date, end: Date) =>
    (data ?? [])
      .filter((p) => {
        const when = new Date(p.paid_at ?? p.created_at ?? "");
        return when >= start && when <= end;
      })
      .reduce((sum, p) => sum + p.amount_cents, 0);

  const monthCents = sumInRange(monthStart, now);
  const lastMonthCents = sumInRange(lastMonthStart, lastMonthEnd);

  if (lastMonthCents > 0) {
    return Math.round(((monthCents - lastMonthCents) / lastMonthCents) * 100);
  }
  return monthCents > 0 ? 100 : 0;
}

async function getBookingActivityItems(
  companyId: string,
  limit: number
): Promise<HomeActivityItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_name, service, status, created_at, booking_date")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[home-overview] getBookingActivityItems", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const booking = row as Booking;
    const customerName = booking.customer_name?.trim() || null;
    const service = booking.service?.trim() || null;

    return {
      id: `booking-${booking.id}`,
      kind: "booking" as const,
      title: bookingActivityTitle(),
      subtitle: activityServiceForCustomer(service, customerName),
      status: booking.status,
      createdAt: booking.created_at ?? booking.booking_date ?? "",
      entityId: booking.id,
    };
  });
}

async function getFinancialActivityItems(
  companyId: string,
  limit: number
): Promise<HomeActivityItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const [paymentsRes, invoicesRes, quotesRes, leadsRes] = await Promise.all([
    supabase
      .from("customer_payments")
      .select("id, amount_cents, status, created_at, paid_at, customers(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, created_at, customers(name), invoice_line_items(description, sort_order)"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("quotes")
      .select(
        "id, quote_number, status, created_at, customers(name), quote_line_items(description, sort_order)"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("leads")
      .select("id, name, email, message, lead_type, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: HomeActivityItem[] = [];

  for (const payment of paymentsRes.data ?? []) {
    const customerName =
      (payment.customers as { name?: string } | null)?.name ?? null;
    items.push({
      id: `payment-${payment.id}`,
      kind: "payment",
      title: paymentActivityTitle(),
      subtitle: paymentActivitySubtitle(payment.amount_cents, customerName),
      status: payment.status,
      createdAt: payment.paid_at ?? payment.created_at ?? "",
      entityId: payment.id,
    });
  }

  for (const invoice of invoicesRes.data ?? []) {
    const customerName =
      (invoice.customers as { name?: string } | null)?.name ?? null;
    const service = firstLineItemDescription(
      invoice.invoice_line_items as { description: string; sort_order?: number }[] | null
    );
    items.push({
      id: `invoice-${invoice.id}`,
      kind: "invoice",
      title: invoiceActivityTitle(invoice.status),
      subtitle: activityServiceForCustomer(service, customerName),
      status: invoice.status,
      createdAt: invoice.created_at ?? "",
      entityId: invoice.id,
    });
  }

  for (const quote of quotesRes.data ?? []) {
    const customerName =
      (quote.customers as { name?: string } | null)?.name ?? null;
    const service = firstLineItemDescription(
      quote.quote_line_items as { description: string; sort_order?: number }[] | null
    );
    items.push({
      id: `quote-${quote.id}`,
      kind: "quote",
      title: quoteActivityTitle(quote.status),
      subtitle: activityServiceForCustomer(service, customerName),
      status: quote.status,
      createdAt: quote.created_at ?? "",
      entityId: quote.id,
    });
  }

  for (const lead of leadsRes.data ?? []) {
    items.push({
      id: `lead-${lead.id}`,
      kind: "lead",
      title: leadActivityTitle(),
      subtitle: leadActivitySubtitle({
        name: lead.name,
        email: lead.email,
        message: lead.message,
        leadType: lead.lead_type,
      }),
      status: lead.status,
      createdAt: lead.created_at ?? "",
      entityId: lead.id,
    });
  }

  return items;
}

async function getReviewActivityItems(
  companyId: string,
  limit: number
): Promise<HomeActivityItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("review_requests")
    .select("id, customer_name, status, sent_at, created_at, bookings(service)")
    .eq("company_id", companyId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[home-overview] getReviewActivityItems", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const booking = row.bookings as { service?: string | null } | null;
    const service = booking?.service?.trim() || null;
    const customerName = row.customer_name?.trim() || null;

    return {
      id: `review-${row.id}`,
      kind: "review" as const,
      title: reviewActivityTitle(),
      subtitle: activityServiceForCustomer(service, customerName),
      status: row.status,
      createdAt: row.sent_at ?? row.created_at ?? "",
      entityId: row.id,
    };
  });
}

async function getHomeRecentActivity(
  companyId: string,
  limit = 10
): Promise<HomeActivityItem[]> {
  const [logEntries, bookingItems, financialItems, reviewItems] = await Promise.all([
    listCompanyActivity(companyId, limit),
    getBookingActivityItems(companyId, limit),
    getFinancialActivityItems(companyId, limit),
    getReviewActivityItems(companyId, limit),
  ]);

  const logItems: HomeActivityItem[] = logEntries.map((entry) => ({
    id: `log-${entry.id}`,
    kind: "activity",
    title: activityLogTitle(entry.action),
    subtitle: activityLogSubtitle(entry.metadata),
    status: null,
    createdAt: entry.createdAt,
    entityId: entry.entityId ?? undefined,
  }));

  const merged = [...logItems, ...bookingItems, ...financialItems, ...reviewItems]
    .filter((item) => item.createdAt)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const seen = new Set<string>();
  const unique: HomeActivityItem[] = [];
  for (const item of merged) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length >= limit) break;
  }

  return unique;
}

function formatBookingSchedule(bookingDate: string): {
  timeLabel: string;
  dayLabel: string;
} {
  const when = new Date(bookingDate);
  const timeLabel = when.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const todayStart = startOfToday();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrowStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  let dayLabel: string;
  if (when >= todayStart && when < tomorrowStart) {
    dayLabel = "Today";
  } else if (when >= tomorrowStart && when < dayAfterTomorrow) {
    dayLabel = "Tomorrow";
  } else {
    dayLabel = when.toLocaleDateString("en-ZA", {
      month: "short",
      day: "numeric",
    });
  }

  return { timeLabel, dayLabel };
}

async function getUpcomingBookings(
  companyId: string,
  limit = 5
): Promise<UpcomingBookingItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_name, service, status, booking_date")
    .eq("company_id", companyId)
    .not("status", "eq", "cancelled")
    .gte("booking_date", new Date().toISOString())
    .order("booking_date", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[home-overview] getUpcomingBookings", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.booking_date)
    .map((row) => {
      const schedule = formatBookingSchedule(row.booking_date as string);
      return {
        id: row.id,
        customerName: row.customer_name?.trim() || "Customer",
        service: row.service?.trim() || "Service",
        status: row.status ?? "pending",
        timeLabel: schedule.timeLabel,
        dayLabel: schedule.dayLabel,
      };
    });
}

function pickTopInsight(
  insights: Awaited<ReturnType<typeof generateAiInsights>>
): HomeOverviewInsight | null {
  if (insights.length === 0) return null;
  const sorted = [...insights].sort((a, b) => {
    const priorityScore = (p?: string) =>
      p === "high" ? 0 : p === "medium" ? 1 : 2;
    return priorityScore(a.priority) - priorityScore(b.priority);
  });
  const top = sorted[0];
  return {
    title: top.title,
    body: top.body,
    priority: top.priority,
  };
}

export async function getHomeOverviewData(
  companyId: string
): Promise<HomeOverviewData> {
  const emptyMetrics: HomeOverviewData["metrics"] = {
    bookingsToday: 0,
    bookingsYesterday: 0,
    pendingBookings: 0,
    totalBookings: 0,
    customers: 0,
    newCustomersThisMonth: 0,
    revenueTodayCents: 0,
    revenueMonthCents: 0,
    revenueGrowthPercent: 0,
    pendingQuotes: 0,
    outstandingInvoices: 0,
    overdueInvoices: 0,
    outstandingInvoicesCents: 0,
    newLeads7d: 0,
    qualifiedLeads7d: 0,
    businessHealthScore: 0,
  };

  if (!isSupabaseConfigured() || !companyId) {
    return {
      metrics: emptyMetrics,
      upcomingBookings: [],
      revenueOverview: {
        totalCents: 0,
        growthPercent: 0,
        paidCents: 0,
        outstandingCents: 0,
        overdueCents: 0,
      },
      recentActivity: [],
      topInsight: null,
    };
  }

  const supabase = await createClient();

  const [
    bookingsRes,
    customersCount,
    revenue,
    health,
    insights,
    recentActivity,
    bookingsToday,
    pendingQuotes,
    invoiceCounts,
    newLeads7d,
    bookingsYesterday,
    qualifiedLeads7d,
    newCustomersThisMonth,
    revenueGrowthPercent,
    upcomingBookings,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("status")
      .eq("company_id", companyId),
    countCustomersForCompany(companyId),
    getRevenueMetrics(companyId),
    getBusinessHealthScore(companyId),
    generateAiInsights(companyId),
    getHomeRecentActivity(companyId),
    countBookingsToday(companyId),
    countPendingQuotes(companyId),
    getInvoiceCounts(companyId),
    countNewLeads(companyId),
    countBookingsYesterday(companyId),
    countQualifiedLeads(companyId),
    countNewCustomersThisMonth(companyId),
    getRevenueGrowthPercent(companyId),
    getUpcomingBookings(companyId),
  ]);

  const bookingRows = bookingsRes.data ?? [];
  const totalBookings = bookingRows.length;
  const pendingBookings = bookingRows.filter((r) => r.status === "pending").length;

  return {
    metrics: {
      bookingsToday,
      bookingsYesterday,
      pendingBookings,
      totalBookings,
      customers: customersCount,
      newCustomersThisMonth,
      revenueTodayCents: revenue.revenueTodayCents,
      revenueMonthCents: revenue.revenueMonthCents,
      revenueGrowthPercent,
      pendingQuotes,
      outstandingInvoices: invoiceCounts.outstanding,
      overdueInvoices: invoiceCounts.overdue,
      outstandingInvoicesCents: revenue.outstandingInvoicesCents,
      newLeads7d,
      qualifiedLeads7d,
      businessHealthScore: health.score,
    },
    upcomingBookings,
    revenueOverview: {
      totalCents:
        revenue.revenueMonthCents +
        revenue.outstandingInvoicesCents +
        revenue.overdueInvoicesCents,
      growthPercent: revenueGrowthPercent,
      paidCents: revenue.revenueMonthCents,
      outstandingCents: revenue.outstandingInvoicesCents,
      overdueCents: revenue.overdueInvoicesCents,
    },
    recentActivity,
    topInsight: pickTopInsight(insights),
  };
}
