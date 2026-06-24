import type {
  HomeActivityItem,
  HomeOverviewData,
  HomeOverviewInsight,
} from "@/lib/operations/metrics";
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

function formatActivityAction(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
    return {
      id: `booking-${booking.id}`,
      kind: "booking" as const,
      title: booking.customer_name
        ? `Booking — ${booking.customer_name}`
        : "New booking",
      subtitle: booking.service ?? "Service not specified",
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
      .select("id, amount_cents, status, created_at, paid_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("quotes")
      .select("id, quote_number, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("leads")
      .select("id, name, email, lead_type, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: HomeActivityItem[] = [];

  for (const payment of paymentsRes.data ?? []) {
    items.push({
      id: `payment-${payment.id}`,
      kind: "payment",
      title: "Payment received",
      subtitle: `R ${(payment.amount_cents / 100).toFixed(2)}`,
      status: payment.status,
      createdAt: payment.paid_at ?? payment.created_at ?? "",
      entityId: payment.id,
    });
  }

  for (const invoice of invoicesRes.data ?? []) {
    items.push({
      id: `invoice-${invoice.id}`,
      kind: "invoice",
      title: `Invoice ${invoice.invoice_number}`,
      subtitle: "Invoice activity",
      status: invoice.status,
      createdAt: invoice.created_at ?? "",
      entityId: invoice.id,
    });
  }

  for (const quote of quotesRes.data ?? []) {
    items.push({
      id: `quote-${quote.id}`,
      kind: "quote",
      title: `Quote ${quote.quote_number}`,
      subtitle: "Quote activity",
      status: quote.status,
      createdAt: quote.created_at ?? "",
      entityId: quote.id,
    });
  }

  for (const lead of leadsRes.data ?? []) {
    items.push({
      id: `lead-${lead.id}`,
      kind: "lead",
      title: lead.name ? `Lead — ${lead.name}` : "New lead",
      subtitle: lead.lead_type ?? lead.email ?? "Inbound lead",
      status: lead.status,
      createdAt: lead.created_at ?? "",
      entityId: lead.id,
    });
  }

  return items;
}

async function getHomeRecentActivity(
  companyId: string,
  limit = 10
): Promise<HomeActivityItem[]> {
  const [logEntries, bookingItems, financialItems] = await Promise.all([
    listCompanyActivity(companyId, limit),
    getBookingActivityItems(companyId, limit),
    getFinancialActivityItems(companyId, limit),
  ]);

  const logItems: HomeActivityItem[] = logEntries.map((entry) => ({
    id: `log-${entry.id}`,
    kind: "activity",
    title: formatActivityAction(entry.action),
    subtitle: entry.entityType
      ? `${entry.entityType.replace(/_/g, " ")}${entry.entityId ? "" : ""}`
      : "Workspace activity",
    status: null,
    createdAt: entry.createdAt,
    entityId: entry.entityId ?? undefined,
  }));

  const merged = [...logItems, ...bookingItems, ...financialItems]
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
    pendingBookings: 0,
    totalBookings: 0,
    customers: 0,
    revenueTodayCents: 0,
    revenueMonthCents: 0,
    pendingQuotes: 0,
    outstandingInvoices: 0,
    overdueInvoices: 0,
    outstandingInvoicesCents: 0,
    newLeads7d: 0,
    businessHealthScore: 0,
  };

  if (!isSupabaseConfigured() || !companyId) {
    return { metrics: emptyMetrics, recentActivity: [], topInsight: null };
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
  ]);

  const bookingRows = bookingsRes.data ?? [];
  const totalBookings = bookingRows.length;
  const pendingBookings = bookingRows.filter((r) => r.status === "pending").length;

  return {
    metrics: {
      bookingsToday,
      pendingBookings,
      totalBookings,
      customers: customersCount,
      revenueTodayCents: revenue.revenueTodayCents,
      revenueMonthCents: revenue.revenueMonthCents,
      pendingQuotes,
      outstandingInvoices: invoiceCounts.outstanding,
      overdueInvoices: invoiceCounts.overdue,
      outstandingInvoicesCents: revenue.outstandingInvoicesCents,
      newLeads7d,
      businessHealthScore: health.score,
    },
    recentActivity,
    topInsight: pickTopInsight(insights),
  };
}
