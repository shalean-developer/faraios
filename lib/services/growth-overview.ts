import type { GrowthOverviewData } from "@/lib/operations/metrics";
import { getMarketingAnalytics } from "@/lib/services/marketing-analytics";
import { runSeoAudit } from "@/lib/services/seo-audit";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

const emptyMetrics: GrowthOverviewData["metrics"] = {
  seoScore: 0,
  leads30d: 0,
  conversionRate: 0,
  websiteVisits30d: 0,
  reviewRequestsSent30d: 0,
  campaignsSent: 0,
  publishedPosts: 0,
  draftPosts: 0,
};

async function countContentPosts(companyId: string): Promise<{
  published: number;
  draft: number;
}> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { published: 0, draft: 0 };

  const { data, error } = await admin.client
    .from("content_posts")
    .select("status")
    .eq("company_id", companyId);

  if (error) {
    console.error("[growth-overview] countContentPosts", error.message);
    return { published: 0, draft: 0 };
  }

  const rows = data ?? [];
  return {
    published: rows.filter((row) => row.status === "published").length,
    draft: rows.filter((row) => row.status === "draft").length,
  };
}

async function countSentCampaigns(companyId: string): Promise<number> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return 0;

  const { count, error } = await admin.client
    .from("email_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "sent");

  if (error) {
    console.error("[growth-overview] countSentCampaigns", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getGrowthOverviewData(
  companyId: string
): Promise<GrowthOverviewData> {
  if (!isSupabaseConfigured() || !companyId) {
    return { metrics: emptyMetrics, topSeoAction: null };
  }

  const [seo, marketing, content, campaignsSent] = await Promise.all([
    runSeoAudit(companyId),
    getMarketingAnalytics(companyId),
    countContentPosts(companyId),
    countSentCampaigns(companyId),
  ]);

  return {
    metrics: {
      seoScore: seo.score,
      leads30d: marketing.leads,
      conversionRate: marketing.conversionRate,
      websiteVisits30d: marketing.websiteVisits,
      reviewRequestsSent30d: marketing.reviewRequestsSent,
      campaignsSent,
      publishedPosts: content.published,
      draftPosts: content.draft,
    },
    topSeoAction: seo.recommendedActions[0] ?? null,
  };
}
