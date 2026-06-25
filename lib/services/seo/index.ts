import type { SeoV10DashboardData, SeoHealthSnapshot } from "@/types/seo-v10";
import {
  getLatestCrawl,
  getHealthHistory,
  listSeoPages,
} from "./crawl-service";
import { count404Issues, list404Logs } from "./monitor-404-service";
import { countRedirectIssues, listRedirects } from "./redirect-service";
import {
  getOrCreateSeoProject,
  getSeoSettings,
  getSeoSitemapConfig,
  syncIntegrationStatus,
} from "./project-service";
import { listProjectSchemas } from "./schema-service";
import { listReports } from "./report-service";
import { ensureIntegrationSlots } from "./integration-service";
import { countImageIssues, listImageIssues } from "./image-seo-service";
import { getRobotsStatus } from "./sitemap-service";

export async function loadSeoV10Dashboard(
  companyId: string,
  companyName: string
): Promise<SeoV10DashboardData> {
  const empty: SeoV10DashboardData = {
    project: null,
    healthScore: 0,
    pagesScanned: 0,
    criticalIssues: 0,
    warnings: 0,
    passedChecks: 0,
    redirectIssues: 0,
    notFoundIssues: 0,
    imageSeoIssues: 0,
    robotsStatus: "missing",
    latestCrawl: null,
    healthHistory: [],
    pages: [],
    redirects: [],
    notFoundLogs: [],
    sitemap: null,
    settings: null,
    schemas: [],
    reports: [],
    integrations: [],
    imageIssues: [],
  };

  const project = await getOrCreateSeoProject(companyId, companyName);
  if (!project) return empty;

  await syncIntegrationStatus(companyId, project.id);

  const [
    pages,
    latestCrawl,
    healthHistoryRaw,
    redirects,
    notFoundLogs,
    sitemap,
    settings,
    schemas,
    reports,
    integrations,
    imageIssues,
    redirectIssues,
    notFoundIssues,
    imageSeoIssues,
  ] = await Promise.all([
    listSeoPages(project.id),
    getLatestCrawl(project.id),
    getHealthHistory(project.id),
    listRedirects(project.id),
    list404Logs(project.id),
    getSeoSitemapConfig(project.id),
    getSeoSettings(project.id),
    listProjectSchemas(project.id),
    listReports(project.id),
    ensureIntegrationSlots(companyId, project.id),
    listImageIssues(companyId),
    countRedirectIssues(project.id),
    count404Issues(project.id),
    countImageIssues(companyId),
  ]);

  const healthHistory: SeoHealthSnapshot[] = healthHistoryRaw.map((h) => ({
    id: "",
    project_id: project.id,
    company_id: companyId,
    seo_score: h.seo_score,
    health_score: h.health_score,
    pages_scanned: h.pages_scanned,
    critical_issues: h.critical_issues,
    warnings: h.warnings,
    passed_checks: 0,
    recorded_at: h.recorded_at,
  }));

  const pageScores = pages.map((p) => p.seo_score ?? 0).filter((s) => s > 0);
  const healthScore =
    pageScores.length > 0
      ? Math.round(pageScores.reduce((a, b) => a + b, 0) / pageScores.length)
      : latestCrawl
        ? Math.max(
            0,
            100 -
              (latestCrawl.critical_issues * 5 + latestCrawl.warnings * 2)
          )
        : 0;

  const robotsStatus = settings
    ? getRobotsStatus(settings)
    : "missing";

  return {
    project,
    healthScore,
    pagesScanned: latestCrawl?.pages_scanned ?? pages.length,
    criticalIssues: latestCrawl?.critical_issues ?? 0,
    warnings: latestCrawl?.warnings ?? 0,
    passedChecks: latestCrawl?.passed_checks ?? 0,
    redirectIssues,
    notFoundIssues,
    imageSeoIssues,
    robotsStatus,
    latestCrawl,
    healthHistory,
    pages,
    redirects,
    notFoundLogs,
    sitemap,
    settings,
    schemas,
    reports,
    integrations,
    imageIssues,
  };
}

export {
  runProjectCrawl,
  listSeoPages,
  getLatestCrawl,
  getHealthHistory,
} from "./crawl-service";
export { loadSeoV10Dashboard as default };
