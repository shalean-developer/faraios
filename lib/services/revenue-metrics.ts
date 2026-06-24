import { averagePaymentCents } from "@/lib/financial/payment-revenue";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { RevenueMetrics } from "@/types/financial";

const emptyMetrics: RevenueMetrics = {
  revenueTodayCents: 0,
  revenueMonthCents: 0,
  revenueYearCents: 0,
  outstandingInvoicesCents: 0,
  overdueInvoicesCents: 0,
  totalPaidCents: 0,
  averageBookingValueCents: 0,
  quotesSent: 0,
  quotesAccepted: 0,
  quotesRejected: 0,
  quoteConversionRate: 0,
  paymentsSuccessful: 0,
  paymentsFailed: 0,
  paymentsRefunded: 0,
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export async function getRevenueMetrics(companyId: string): Promise<RevenueMetrics> {
  if (!isSupabaseConfigured() || !companyId) return emptyMetrics;

  const supabase = await createClient();
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const [paymentsRes, invoicesRes, quotesRes] = await Promise.all([
    supabase
      .from("customer_payments")
      .select("amount_cents, status, paid_at, created_at")
      .eq("company_id", companyId),
    supabase
      .from("invoices")
      .select("status, balance_due_cents, total_cents")
      .eq("company_id", companyId),
    supabase.from("quotes").select("status").eq("company_id", companyId),
  ]);

  const payments = paymentsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const quotes = quotesRes.data ?? [];

  const paidPayments = payments.filter((p) => p.status === "paid");

  const revenueTodayCents = paidPayments
    .filter((p) => {
      const when = new Date(p.paid_at ?? p.created_at ?? "");
      return when >= todayStart;
    })
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const revenueMonthCents = paidPayments
    .filter((p) => {
      const when = new Date(p.paid_at ?? p.created_at ?? "");
      return when >= monthStart;
    })
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const revenueYearCents = paidPayments
    .filter((p) => {
      const when = new Date(p.paid_at ?? p.created_at ?? "");
      return when >= yearStart;
    })
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const outstandingInvoicesCents = invoices
    .filter((i) => ["issued", "partially_paid"].includes(i.status))
    .reduce((sum, i) => sum + (i.balance_due_cents ?? 0), 0);

  const overdueInvoicesCents = invoices
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + (i.balance_due_cents ?? 0), 0);

  const totalPaidCents = paidPayments.reduce((sum, p) => sum + p.amount_cents, 0);

  const averageBookingValueCents = averagePaymentCents(paidPayments);

  const quotesSent = quotes.filter((q) =>
    ["sent", "viewed", "accepted", "rejected", "converted"].includes(q.status)
  ).length;
  const quotesAccepted = quotes.filter((q) =>
    ["accepted", "converted"].includes(q.status)
  ).length;
  const quotesRejected = quotes.filter((q) => q.status === "rejected").length;
  const quoteConversionRate =
    quotesSent > 0 ? Math.round((quotesAccepted / quotesSent) * 100) : 0;

  const paymentsSuccessful = payments.filter((p) => p.status === "paid").length;
  const paymentsFailed = payments.filter((p) => p.status === "failed").length;
  const paymentsRefunded = payments.filter((p) => p.status === "refunded").length;

  return {
    revenueTodayCents,
    revenueMonthCents,
    revenueYearCents,
    outstandingInvoicesCents,
    overdueInvoicesCents,
    totalPaidCents,
    averageBookingValueCents,
    quotesSent,
    quotesAccepted,
    quotesRejected,
    quoteConversionRate,
    paymentsSuccessful,
    paymentsFailed,
    paymentsRefunded,
  };
}

export type RevenuePeriodPoint = {
  label: string;
  revenueCents: number;
};

export async function getRevenueByPeriod(
  companyId: string,
  period: "daily" | "weekly" | "monthly" | "yearly",
  limit = 12
): Promise<RevenuePeriodPoint[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_payments")
    .select("amount_cents, paid_at, created_at")
    .eq("company_id", companyId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false });

  const payments = data ?? [];
  const buckets = new Map<string, number>();

  for (const p of payments) {
    const when = new Date(p.paid_at ?? p.created_at ?? "");
    if (Number.isNaN(when.getTime())) continue;

    let key: string;
    if (period === "daily") {
      key = when.toISOString().slice(0, 10);
    } else if (period === "weekly") {
      const weekStart = new Date(when);
      weekStart.setDate(when.getDate() - when.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else if (period === "monthly") {
      key = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}`;
    } else {
      key = String(when.getFullYear());
    }

    buckets.set(key, (buckets.get(key) ?? 0) + p.amount_cents);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([label, revenueCents]) => ({ label, revenueCents }));
}
