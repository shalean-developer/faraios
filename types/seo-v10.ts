export type SeoIssueSeverity = "critical" | "warning" | "passed" | "recommendation";

export type SeoIssue = {
  id: string;
  severity: SeoIssueSeverity;
  category: string;
  message: string;
  field?: string;
};

export type SeoProject = {
  id: string;
  company_id: string;
  name: string;
  website_url: string | null;
  domain: string | null;
  language: string;
  country: string;
  business_type: string | null;
  default_schema_type: string;
  sitemap_url: string | null;
  robots_txt_url: string | null;
  gsc_connected: boolean;
  ga_connected: boolean;
  gbp_connected: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SeoPage = {
  id: string;
  project_id: string;
  company_id: string;
  url: string;
  path: string | null;
  page_type: string;
  source_table: string | null;
  source_id: string | null;
  http_status: number | null;
  is_indexable: boolean;
  canonical_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  h1: string | null;
  h2_count: number;
  h3_count: number;
  internal_links: number;
  external_links: number;
  broken_links: number;
  has_schema: boolean;
  has_og_tags: boolean;
  has_twitter_cards: boolean;
  is_https: boolean;
  robots_meta: string | null;
  content_length: number;
  last_crawled_at: string | null;
  seo_score: number | null;
  created_at: string;
  updated_at: string;
};

export type SeoCrawl = {
  id: string;
  project_id: string;
  company_id: string;
  status: "pending" | "running" | "completed" | "failed";
  pages_scanned: number;
  critical_issues: number;
  warnings: number;
  passed_checks: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export type SeoAnalysis = {
  id: string;
  page_id: string;
  crawl_id: string | null;
  company_id: string;
  score: number;
  issues: SeoIssue[];
  critical_count: number;
  warning_count: number;
  passed_count: number;
  recommendation_count: number;
  analyzed_at: string;
};

export type SeoKeyword = {
  id: string;
  page_id: string;
  company_id: string;
  keyword: string;
  is_primary: boolean;
  in_title: boolean;
  in_url: boolean;
  in_meta_description: boolean;
  in_first_paragraph: boolean;
  in_headings: boolean;
  in_image_alt: boolean;
  in_conclusion: boolean;
  density_percent: number;
  recommendations: string[];
  created_at: string;
  updated_at: string;
};

export type SeoMetaRecord = {
  id: string;
  page_id: string;
  company_id: string;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  robots_meta: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  created_at: string;
  updated_at: string;
};

export type SeoSchemaType =
  | "Organization"
  | "LocalBusiness"
  | "Article"
  | "BlogPosting"
  | "FAQPage"
  | "HowTo"
  | "Product"
  | "Review"
  | "Recipe"
  | "VideoObject"
  | "Course"
  | "Event"
  | "Person"
  | "BreadcrumbList"
  | "WebSite"
  | "SearchAction"
  | "Custom";

export type SeoSchemaRecord = {
  id: string;
  project_id: string;
  company_id: string;
  page_id: string | null;
  schema_type: string;
  json_ld: Record<string, unknown>;
  is_valid: boolean;
  validation_errors: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SeoRedirect = {
  id: string;
  project_id: string;
  company_id: string;
  source_url: string;
  destination_url: string | null;
  status_code: number;
  hits: number;
  last_visit_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Seo404Log = {
  id: string;
  project_id: string;
  company_id: string;
  missing_url: string;
  referrer_host: string | null;
  user_agent_family: string | null;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
};

export type SeoSitemapConfig = {
  id: string;
  project_id: string;
  company_id: string;
  include_pages: boolean;
  include_posts: boolean;
  include_products: boolean;
  include_categories: boolean;
  include_images: boolean;
  include_videos: boolean;
  include_news: boolean;
  exclusions: string[];
  status: "pending" | "generating" | "ok" | "error";
  last_generated_at: string | null;
  url_count: number;
  sitemap_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SeoReport = {
  id: string;
  project_id: string;
  company_id: string;
  report_type: string;
  title: string;
  data: Record<string, unknown>;
  seo_score: number | null;
  health_score: number | null;
  created_at: string;
};

export type SeoSettings = {
  project_id: string;
  company_id: string;
  robots_txt_content: string | null;
  robots_allow_rules: string[];
  robots_disallow_rules: string[];
  crawl_delay: number | null;
  sitemap_reference: string | null;
  auto_crawl_enabled: boolean;
  crawl_frequency_days: number;
  created_at: string;
  updated_at: string;
};

export type SeoHealthSnapshot = {
  id: string;
  project_id: string;
  company_id: string;
  seo_score: number;
  health_score: number;
  pages_scanned: number;
  critical_issues: number;
  warnings: number;
  passed_checks: number;
  recorded_at: string;
};

export type SeoImageIssue = {
  id: string;
  page_id: string;
  company_id: string;
  image_url: string;
  issue_type: string;
  recommendation: string | null;
  file_size_kb: number | null;
  created_at: string;
};

export type SeoIntegrationProvider =
  | "google_search_console"
  | "google_analytics"
  | "google_business_profile"
  | "google_indexing_api";

export type SeoIntegration = {
  id: string;
  company_id: string;
  project_id: string | null;
  provider: SeoIntegrationProvider;
  status: "disconnected" | "connected" | "error";
  config: Record<string, unknown>;
  connected_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

/** V10 dashboard aggregate — additive to existing SeoAuditResult */
export type SeoV10DashboardData = {
  project: SeoProject | null;
  healthScore: number;
  pagesScanned: number;
  criticalIssues: number;
  warnings: number;
  passedChecks: number;
  redirectIssues: number;
  notFoundIssues: number;
  imageSeoIssues: number;
  robotsStatus: "ok" | "partial" | "missing";
  latestCrawl: SeoCrawl | null;
  healthHistory: SeoHealthSnapshot[];
  pages: SeoPage[];
  redirects: SeoRedirect[];
  notFoundLogs: Seo404Log[];
  sitemap: SeoSitemapConfig | null;
  settings: SeoSettings | null;
  schemas: SeoSchemaRecord[];
  reports: SeoReport[];
  integrations: SeoIntegration[];
  imageIssues: SeoImageIssue[];
};

export type PageAnalysisInput = {
  url: string;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  h2Count: number;
  h3Count: number;
  contentLength: number;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: number;
  hasSchema: boolean;
  hasOgTags: boolean;
  hasTwitterCards: boolean;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  isHttps: boolean;
  isIndexable: boolean;
  httpStatus: number | null;
  focusKeywords: string[];
  imageAltMissing: number;
  imageIssues: { url: string; issue: string }[];
};

export type PageScoreResult = {
  score: number;
  issues: SeoIssue[];
  criticalCount: number;
  warningCount: number;
  passedCount: number;
  recommendationCount: number;
};

export type KeywordAnalysisResult = {
  keyword: string;
  inTitle: boolean;
  inUrl: boolean;
  inMetaDescription: boolean;
  inFirstParagraph: boolean;
  inHeadings: boolean;
  inImageAlt: boolean;
  inConclusion: boolean;
  densityPercent: number;
  recommendations: string[];
};
