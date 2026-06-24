import type { IntelligenceOverviewData } from "@/lib/operations/metrics";
import { generateAiInsights } from "@/lib/services/ai-assistant";
import { getBiMetrics } from "@/lib/services/bi-metrics";
import { getBusinessHealthScore } from "@/lib/services/business-health";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

const emptyMetrics: IntelligenceOverviewData["metrics"] = {
  businessHealthScore: 0,
  revenueMonthCents: 0,
  revenueGrowthPercent: 0,
  bookingConversionRate: 0,
  newCustomers30d: 0,
  activeWorkflows: 0,
};

function pickTopInsight(
  insights: Awaited<ReturnType<typeof generateAiInsights>>
): IntelligenceOverviewData["topInsight"] {
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

async function countActiveWorkflows(companyId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("workflows")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("enabled", true);

  if (error) {
    console.error("[intelligence-overview] countActiveWorkflows", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getIntelligenceOverviewData(
  companyId: string
): Promise<IntelligenceOverviewData> {
  if (!isSupabaseConfigured() || !companyId) {
    return {
      metrics: emptyMetrics,
      topInsight: null,
      healthRecommendations: [],
    };
  }

  const [bi, health, insights, activeWorkflows] = await Promise.all([
    getBiMetrics(companyId),
    getBusinessHealthScore(companyId),
    generateAiInsights(companyId),
    countActiveWorkflows(companyId),
  ]);

  return {
    metrics: {
      businessHealthScore: health.score,
      revenueMonthCents: bi.revenue.monthCents,
      revenueGrowthPercent: bi.revenue.growthPercent,
      bookingConversionRate: bi.bookings.conversionRate,
      newCustomers30d: bi.customers.new,
      activeWorkflows,
    },
    topInsight: pickTopInsight(insights),
    healthRecommendations: health.recommendations.slice(0, 3),
  };
}
