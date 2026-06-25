import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SeoReport } from "@/types/seo-v10";
import type { SeoV10DashboardData } from "@/types/seo-v10";

export async function listReports(projectId: string, limit = 20): Promise<SeoReport[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("seo_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    project_id: row.project_id,
    company_id: row.company_id,
    report_type: row.report_type,
    title: row.title,
    data: (row.data as Record<string, unknown>) ?? {},
    seo_score: row.seo_score,
    health_score: row.health_score,
    created_at: row.created_at,
  }));
}

export async function generateHealthReport(input: {
  projectId: string;
  companyId: string;
  dashboard: SeoV10DashboardData;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const title = `SEO Health Report — ${new Date().toLocaleDateString("en-ZA")}`;
  const data = {
    seoScore: input.dashboard.healthScore,
    healthScore: input.dashboard.healthScore,
    pagesScanned: input.dashboard.pagesScanned,
    criticalIssues: input.dashboard.criticalIssues,
    warnings: input.dashboard.warnings,
    passedChecks: input.dashboard.passedChecks,
    redirectIssues: input.dashboard.redirectIssues,
    notFoundIssues: input.dashboard.notFoundIssues,
    imageSeoIssues: input.dashboard.imageSeoIssues,
    sitemapStatus: input.dashboard.sitemap?.status ?? "pending",
    robotsStatus: input.dashboard.robotsStatus,
    latestCrawl: input.dashboard.latestCrawl?.completed_at,
    recommendations: input.dashboard.pages
      .filter((p) => (p.seo_score ?? 100) < 70)
      .slice(0, 10)
      .map((p) => ({ url: p.url, score: p.seo_score })),
    keywordRankingsPlaceholder: "Connect Google Search Console for ranking data",
  };

  const { data: row, error } = await admin.client
    .from("seo_reports")
    .insert({
      project_id: input.projectId,
      company_id: input.companyId,
      report_type: "health",
      title,
      data,
      seo_score: input.dashboard.healthScore,
      health_score: input.dashboard.healthScore,
    })
    .select("id")
    .single();

  if (error || !row) return { ok: false, error: error?.message ?? "Failed" };
  return { ok: true, id: row.id };
}

export function exportReportJson(report: SeoReport): string {
  return JSON.stringify(
    {
      title: report.title,
      type: report.report_type,
      seoScore: report.seo_score,
      healthScore: report.health_score,
      generatedAt: report.created_at,
      ...report.data,
    },
    null,
    2
  );
}

export function exportReportCsv(report: SeoReport): string {
  const lines = [
    "metric,value",
    `seo_score,${report.seo_score ?? ""}`,
    `health_score,${report.health_score ?? ""}`,
    `generated_at,${report.created_at}`,
  ];
  const recs = (report.data.recommendations as { url: string; score: number }[]) ?? [];
  for (const r of recs) {
    lines.push(`page,${r.url},${r.score}`);
  }
  return lines.join("\n");
}
