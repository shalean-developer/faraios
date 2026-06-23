import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { getBiMetrics } from "@/lib/services/bi-metrics";
import { getRevenueMetrics } from "@/lib/services/revenue-metrics";
import type { AiInsight } from "@/types/v6-engine";
import { formatRevenue } from "@/lib/operations/metrics";

export async function generateAiInsights(companyId: string): Promise<AiInsight[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const [bi, revenue, bookingsRes, invoicesRes, customersRes] = await Promise.all([
    getBiMetrics(companyId),
    getRevenueMetrics(companyId),
    supabase
      .from("bookings")
      .select("service, price_cents, status")
      .eq("company_id", companyId)
      .eq("status", "completed"),
    supabase
      .from("invoices")
      .select("id, status, balance_due_cents, due_date")
      .eq("company_id", companyId),
    supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", companyId),
  ]);

  const insights: AiInsight[] = [];

  if (bi.revenue.growthPercent !== 0) {
    const direction = bi.revenue.growthPercent > 0 ? "increased" : "decreased";
    insights.push({
      type: "insight",
      title: "Revenue trend",
      body: `Revenue ${direction} ${Math.abs(bi.revenue.growthPercent)}% this month compared to last month.`,
      priority: bi.revenue.growthPercent < 0 ? "high" : "low",
    });
  }

  const serviceRevenue = new Map<string, number>();
  for (const b of bookingsRes.data ?? []) {
    const svc = b.service ?? "Other";
    serviceRevenue.set(svc, (serviceRevenue.get(svc) ?? 0) + (b.price_cents ?? 0));
  }
  const topService = [...serviceRevenue.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topService) {
    insights.push({
      type: "insight",
      title: "Top revenue service",
      body: `${topService[0]} generates the highest revenue at ${formatRevenue(topService[1])}.`,
    });
  }

  if (bi.marketing.topSources.length > 0) {
    const top = bi.marketing.topSources[0];
    insights.push({
      type: "insight",
      title: "Top traffic source",
      body: `${top.source || "Direct"} produces the most leads with ${top.count} in the last 30 days.`,
    });
  }

  const overdueInvoices = (invoicesRes.data ?? []).filter(
    (i) => i.status === "overdue" || (i.balance_due_cents > 0 && i.status === "issued")
  );
  if (overdueInvoices.length > 0) {
    insights.push({
      type: "recommendation",
      title: "Follow up on invoices",
      body: `${overdueInvoices.length} invoice(s) need attention — send payment reminders.`,
      priority: "high",
    });
  }

  if (bi.customers.churnRisk > 0) {
    insights.push({
      type: "recommendation",
      title: "Win-back opportunity",
      body: `Create a promotion for ${bi.customers.churnRisk} inactive customers who haven't booked in 90+ days.`,
      priority: "medium",
    });
  }

  const recentCompleted = await supabase
    .from("bookings")
    .select("customer_email")
    .eq("company_id", companyId)
    .eq("status", "completed")
    .gte("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const recentCount = recentCompleted.data?.length ?? 0;
  if (recentCount > 0) {
    insights.push({
      type: "recommendation",
      title: "Review requests",
      body: `Send review requests to ${recentCount} recent customers who completed bookings this month.`,
      priority: "low",
    });
  }

  if (bi.bookings.total > 0 && bi.operations.staffUtilization < 60) {
    insights.push({
      type: "recommendation",
      title: "Staff availability",
      body: "Consider adding more availability on high-demand days to capture additional bookings.",
      priority: "medium",
    });
  }

  return insights;
}

export async function aiSearch(
  companyId: string,
  query: string
): Promise<AiInsight[]> {
  if (!isSupabaseConfigured() || !query.trim()) return [];

  const supabase = await createClient();
  const q = query.trim().toLowerCase();
  const results: AiInsight[] = [];

  if (q.includes("overdue") && q.includes("invoice")) {
    const { data } = await supabase
      .from("invoices")
      .select("invoice_number, balance_due_cents, status")
      .eq("company_id", companyId)
      .in("status", ["overdue", "issued", "partially_paid"])
      .gt("balance_due_cents", 0)
      .limit(10);
    for (const inv of data ?? []) {
      results.push({
        type: "search_result",
        title: inv.invoice_number,
        body: `Balance: ${formatRevenue(inv.balance_due_cents)} — ${inv.status}`,
      });
    }
    if (results.length === 0) {
      results.push({
        type: "search_result",
        title: "No overdue invoices",
        body: "All invoices are paid or have no outstanding balance.",
      });
    }
    return results;
  }

  if (q.includes("customer") || q.includes("booked")) {
    const serviceMatch = q.match(/booked\s+(.+)/);
    const serviceFilter = serviceMatch?.[1]?.trim();
    let bookingQuery = supabase
      .from("bookings")
      .select("customer_name, customer_email, service, status")
      .eq("company_id", companyId)
      .limit(15);
    if (serviceFilter) {
      bookingQuery = bookingQuery.ilike("service", `%${serviceFilter}%`);
    }
    const { data } = await bookingQuery;
    for (const b of data ?? []) {
      results.push({
        type: "search_result",
        title: b.customer_name ?? "Unknown",
        body: `${b.service ?? "Service"} — ${b.status}${b.customer_email ? ` (${b.customer_email})` : ""}`,
      });
    }
    return results;
  }

  if (q.includes("lead")) {
    const { data } = await supabase
      .from("leads")
      .select("name, email, status, source")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10);
    for (const l of data ?? []) {
      results.push({
        type: "search_result",
        title: l.name ?? l.email ?? "Lead",
        body: `${l.status} — source: ${l.source ?? "unknown"}`,
      });
    }
    return results;
  }

  return [
    {
      type: "search_result",
      title: "Try a specific search",
      body: 'Examples: "Show overdue invoices", "Find customers who booked deep cleaning", "Show leads"',
    },
  ];
}
