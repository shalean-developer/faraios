import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { getBiMetrics } from "@/lib/services/bi-metrics";
import type { BusinessHealthScore } from "@/types/v6-engine";

export async function getBusinessHealthScore(
  companyId: string
): Promise<BusinessHealthScore> {
  if (!isSupabaseConfigured()) {
    return {
      score: 0,
      factors: {
        revenueTrend: 0,
        bookingGrowth: 0,
        reviewActivity: 0,
        customerRetention: 0,
        leadConversion: 0,
      },
      recommendations: ["Connect your data sources to generate a health score."],
    };
  }

  const supabase = await createClient();
  const bi = await getBiMetrics(companyId);

  const [reviewsRes, lastMonthBookingsRes, thisMonthBookingsRes] = await Promise.all([
    supabase
      .from("review_requests")
      .select("status")
      .eq("company_id", companyId),
    supabase
      .from("bookings")
      .select("id")
      .eq("company_id", companyId)
      .gte(
        "created_at",
        new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()
      )
      .lt(
        "created_at",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      ),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte(
        "created_at",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      ),
  ]);

  const reviews = reviewsRes.data ?? [];
  const lastMonthBookings = lastMonthBookingsRes.data?.length ?? 0;
  const thisMonthBookings = thisMonthBookingsRes.count ?? 0;

  const revenueTrend = Math.min(100, Math.max(0, 50 + bi.revenue.growthPercent));
  const bookingGrowth =
    lastMonthBookings > 0
      ? Math.min(100, Math.round((thisMonthBookings / lastMonthBookings) * 50))
      : thisMonthBookings > 0
        ? 70
        : 30;

  const reviewSent = reviews.filter((r) => r.status === "sent").length;
  const reviewClicked = reviews.filter((r) => r.status === "clicked").length;
  const reviewActivity =
    reviewSent > 0 ? Math.min(100, Math.round((reviewClicked / reviewSent) * 100) + 20) : 40;

  const retentionBase =
    bi.customers.active + bi.customers.churnRisk > 0
      ? Math.round(
          (bi.customers.active / (bi.customers.active + bi.customers.churnRisk)) * 100
        )
      : 50;
  const customerRetention = Math.min(100, retentionBase);

  const leadConversion = Math.min(100, bi.marketing.conversionRate * 5 + 20);

  const factors = {
    revenueTrend,
    bookingGrowth,
    reviewActivity,
    customerRetention,
    leadConversion,
  };

  const score = Math.round(
    (revenueTrend * 0.25 +
      bookingGrowth * 0.2 +
      reviewActivity * 0.15 +
      customerRetention * 0.25 +
      leadConversion * 0.15)
  );

  const recommendations: string[] = [];
  if (bi.revenue.growthPercent < 0) {
    recommendations.push("Revenue declined this month — review pricing and follow up on outstanding quotes.");
  }
  if (bi.customers.churnRisk > 5) {
    recommendations.push(
      `Send win-back campaigns to ${bi.customers.churnRisk} inactive customers.`
    );
  }
  if (reviewSent < 5) {
    recommendations.push("Enable auto review requests after completed bookings.");
  }
  if (bi.marketing.leads > 0 && bi.marketing.conversionRate < 10) {
    recommendations.push("Improve lead conversion — follow up on new leads within 24 hours.");
  }
  if (bi.operations.staffUtilization < 50) {
    recommendations.push("Assign staff to more bookings to improve utilization.");
  }
  if (bi.bookings.cancelled > bi.bookings.completed * 0.2) {
    recommendations.push("High cancellation rate — send confirmation reminders before appointments.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Business is performing well — keep monitoring key metrics weekly.");
  }

  return { score, factors, recommendations };
}
