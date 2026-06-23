import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { getBiMetrics } from "@/lib/services/bi-metrics";
import { getRevenueMetrics, getRevenueByPeriod } from "@/lib/services/revenue-metrics";
import { getMarketingAnalytics } from "@/lib/services/marketing-analytics";
import type { AdvancedReportSection } from "@/types/v6-engine";
import { formatRevenue } from "@/lib/operations/metrics";

export async function getAdvancedReports(companyId: string): Promise<{
  revenue: AdvancedReportSection[];
  bookings: AdvancedReportSection[];
  customers: AdvancedReportSection[];
  marketing: AdvancedReportSection[];
}> {
  if (!isSupabaseConfigured()) {
    return { revenue: [], bookings: [], customers: [], marketing: [] };
  }

  const supabase = await createClient();
  const [metrics, daily, weekly, monthly, yearly, marketing, bookingsRes, customersRes, paymentsRes] =
    await Promise.all([
      getRevenueMetrics(companyId),
      getRevenueByPeriod(companyId, "daily", 7),
      getRevenueByPeriod(companyId, "weekly", 8),
      getRevenueByPeriod(companyId, "monthly", 12),
      getRevenueByPeriod(companyId, "yearly", 3),
      getMarketingAnalytics(companyId),
      supabase
        .from("bookings")
        .select("id, status, service, assigned_staff_id, source, price_cents, customer_id")
        .eq("company_id", companyId),
      supabase.from("customers").select("id, created_at").eq("company_id", companyId),
      supabase
        .from("customer_payments")
        .select("amount_cents, customer_id")
        .eq("company_id", companyId)
        .eq("status", "paid"),
    ]);

  const bookings = bookingsRes.data ?? [];
  const customers = customersRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const revenueSections: AdvancedReportSection[] = [
    {
      title: "Daily revenue (last 7 days)",
      rows: daily.map((d) => ({ label: d.label, value: formatRevenue(d.revenueCents) })),
    },
    {
      title: "Weekly revenue",
      rows: weekly.map((d) => ({ label: d.label, value: formatRevenue(d.revenueCents) })),
    },
    {
      title: "Monthly revenue",
      rows: monthly.map((d) => ({ label: d.label, value: formatRevenue(d.revenueCents) })),
    },
    {
      title: "Annual revenue",
      rows: yearly.map((d) => ({ label: d.label, value: formatRevenue(d.revenueCents) })),
    },
    {
      title: "Summary",
      rows: [
        { label: "Today", value: formatRevenue(metrics.revenueTodayCents) },
        { label: "This month", value: formatRevenue(metrics.revenueMonthCents) },
        { label: "This year", value: formatRevenue(metrics.revenueYearCents) },
        { label: "Outstanding", value: formatRevenue(metrics.outstandingInvoicesCents) },
      ],
    },
  ];

  const byService = new Map<string, number>();
  const byStaff = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const b of bookings) {
    const svc = b.service ?? "Unknown";
    byService.set(svc, (byService.get(svc) ?? 0) + 1);
    const staff = b.assigned_staff_id ?? "Unassigned";
    byStaff.set(staff, (byStaff.get(staff) ?? 0) + 1);
    const src = b.source ?? "Direct";
    bySource.set(src, (bySource.get(src) ?? 0) + 1);
  }

  const bookingSections: AdvancedReportSection[] = [
    {
      title: "By service",
      rows: [...byService.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, value]) => ({ label, value: String(value) })),
    },
    {
      title: "By staff member",
      rows: [...byStaff.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, value]) => ({
          label: label === "Unassigned" ? "Unassigned" : `Staff ${label.slice(0, 8)}…`,
          value: String(value),
        })),
    },
    {
      title: "By source",
      rows: [...bySource.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value: String(value) })),
    },
    {
      title: "Status breakdown",
      rows: [
        { label: "Completed", value: String(bookings.filter((b) => b.status === "completed").length) },
        { label: "Confirmed", value: String(bookings.filter((b) => b.status === "confirmed").length) },
        { label: "Pending", value: String(bookings.filter((b) => b.status === "pending").length) },
        { label: "Cancelled", value: String(bookings.filter((b) => b.status === "cancelled").length) },
      ],
    },
  ];

  const spendByCustomer = new Map<string, number>();
  for (const p of payments) {
    if (p.customer_id) {
      spendByCustomer.set(
        p.customer_id,
        (spendByCustomer.get(p.customer_id) ?? 0) + p.amount_cents
      );
    }
  }
  const ltvValues = [...spendByCustomer.values()];
  const avgLtv =
    ltvValues.length > 0
      ? Math.round(ltvValues.reduce((a, b) => a + b, 0) / ltvValues.length)
      : 0;

  const bookingCounts = new Map<string, number>();
  for (const b of bookings) {
    if (b.customer_id) {
      bookingCounts.set(b.customer_id, (bookingCounts.get(b.customer_id) ?? 0) + 1);
    }
  }

  const repeatCustomers = [...bookingCounts.values()].filter((c) => c > 1).length;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newCustomers = customers.filter((c) => new Date(c.created_at) >= thirtyDaysAgo).length;

  const customerSections: AdvancedReportSection[] = [
    {
      title: "Lifetime value",
      rows: [
        { label: "Average LTV", value: formatRevenue(avgLtv) },
        { label: "Top spenders", value: String(Math.min(5, ltvValues.length)) },
        { label: "Customers with payments", value: String(spendByCustomer.size) },
      ],
    },
    {
      title: "Repeat booking rate",
      rows: [
        {
          label: "Repeat customers",
          value: `${customers.length > 0 ? Math.round((repeatCustomers / customers.length) * 100) : 0}%`,
        },
        { label: "Repeat count", value: String(repeatCustomers) },
      ],
    },
    {
      title: "Average spend",
      rows: [
        {
          label: "Per customer",
          value: formatRevenue(
            customers.length > 0
              ? Math.round(
                  ltvValues.reduce((a, b) => a + b, 0) / Math.max(customers.length, 1)
                )
              : 0
          ),
        },
      ],
    },
    {
      title: "Customer growth",
      rows: [
        { label: "Total customers", value: String(customers.length) },
        { label: "New (30 days)", value: String(newCustomers) },
      ],
    },
  ];

  const marketingSections: AdvancedReportSection[] = [
    {
      title: "Lead sources",
      rows: marketing.topSources.map((s) => ({
        label: s.source || "Unknown",
        value: String(s.count),
      })),
    },
    {
      title: "Conversion funnel",
      rows: [
        { label: "Website visits", value: String(marketing.websiteVisits) },
        { label: "Leads captured", value: String(marketing.leads) },
        { label: "Bookings", value: String(marketing.bookings) },
        { label: "Conversion rate", value: `${marketing.conversionRate}%` },
      ],
    },
    {
      title: "Top pages",
      rows: marketing.topServicePages.slice(0, 5).map((p) => ({
        label: p.page,
        value: String(p.count),
      })),
    },
  ];

  return {
    revenue: revenueSections,
    bookings: bookingSections,
    customers: customerSections,
    marketing: marketingSections,
  };
}
