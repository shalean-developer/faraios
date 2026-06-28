import { getPlatformAdminUserIds, isPlatformAdminUser } from "@/lib/auth/platform-admin";
import { ADMIN_DEVELOPER_OPTIONS } from "@/lib/constants/admin-developers";
import { getPlatformRoleDefinition } from "@/lib/platform/platform-role-definitions";
import {
  getCachedPlatformOverviewMetrics,
  setCachedPlatformOverviewMetrics,
} from "@/lib/services/platform-overview-cache";
import {
  getLatestPlatformOverviewSnapshot,
  savePlatformOverviewSnapshot,
} from "@/lib/services/platform-overview-snapshots";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/schema-errors";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CompanyWithIndustry } from "@/types/database";
import type {
  AdminActivityItem,
  AdminActivityGroup,
  AdminAnalyticsActivity,
  AdminAnalyticsData,
  AdminAnalyticsDeveloperPoint,
  AdminApiLogRow,
  AdminApiUsageData,
  AdminAuditLogRow,
  AdminBusinessDetail,
  AdminBusinessMember,
  AdminCronData,
  AdminCronJobRow,
  AdminCronRunRow,
  AdminDomainRow,
  AdminDomainsData,
  AdminEmailLogRow,
  AdminEmailsData,
  AdminFeatureRequestRow,
  AdminFeatureRequestsData,
  AdminFeatureRequestStats,
  AdminFeatureRequestStatus,
  AdminFeatureRequestPriority,
  AdminSupportData,
  AdminSupportMessageRow,
  AdminSupportStats,
  AdminSupportTicketCategory,
  AdminSupportTicketDetail,
  AdminSupportTicketPriority,
  AdminSupportTicketRow,
  AdminSupportTicketStatus,
  AdminClient,
  AdminClientProject,
  AdminClientStats,
  AdminCompanyNote,
  AdminAssignableProject,
  AdminHealthIssue,
  AdminHealthStatus,
  AdminNotificationPreferences,
  AdminOverviewBusinessRow,
  AdminOverviewFeatureRequestRow,
  AdminOverviewTicketRow,
  AdminPlatformOverviewMetrics,
  AdminPlatformOperationsMetrics,
  AdminPlatformRevenueData,
  AdminPlatformSettings,
  AdminPlatformStatus,
  AdminPlatformUserRow,
  AdminPlatformUserStats,
  AdminAnalyticsPoint,
  AdminProjectActivity,
  AdminProjectDetails,
  AdminMemberAvailability,
  AdminMemberStatus,
  AdminPipelineStatus,
  AdminProject,
  AdminProjectStats,
  AdminRevenueTransaction,
  AdminTeamMember,
} from "@/types/admin";
import type { AppUser } from "@/types/database";
import { normalizePlanSlug, planLabelForSlug, pricingPlans } from "@/lib/data/pricing";

async function resolveAdminQueryClient() {
  const adminClient = tryCreateAdminClient();
  if (adminClient.ok) {
    return adminClient.client;
  }
  return await createClient();
}

/** Server-side Supabase client for admin reads (service role when configured). */
export async function getAdminQueryClient() {
  return resolveAdminQueryClient();
}

/** DB `companies.build_status` values (hyphenated) — shared with client dashboard. */
export type DbBuildStatus =
  | "pending"
  | "in-progress"
  | "review"
  | "completed";

export function dbBuildStatusToAdmin(
  raw: string | null | undefined
): AdminPipelineStatus {
  switch (raw) {
    case "in-progress":
      return "in_progress";
    case "review":
      return "in_review";
    case "completed":
      return "completed";
    default:
      return "pending";
  }
}

export function adminStatusToDb(status: AdminPipelineStatus): DbBuildStatus {
  switch (status) {
    case "in_progress":
      return "in-progress";
    case "in_review":
      return "review";
    case "completed":
      return "completed";
    default:
      return "pending";
  }
}

function formatCreatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type CompanyOnboardingData = {
  pages?: unknown;
  features?: unknown;
  style?: unknown;
  competitors?: unknown;
  project_goal?: unknown;
  contact_phone?: unknown;
  deadline?: unknown;
};

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCompetitors(value: unknown): string | null {
  const single = parseOptionalString(value);
  if (single) {
    return single;
  }
  const list = parseStringList(value);
  return list.length > 0 ? list.join(", ") : null;
}

function companyRowToAdminProject(row: CompanyWithIndustry): AdminProject {
  const email = row.primary_contact_email?.trim() || "—";
  const nameFromContact = row.primary_contact_name?.trim();
  const displayName =
    nameFromContact ||
    (email !== "—" ? email.split("@")[0] ?? "Client" : "Unknown client");
  const onboardingData = (row.onboarding_data ?? {}) as CompanyOnboardingData;

  return {
    id: row.id,
    slug: row.slug,
    businessName: row.name,
    user: {
      name: displayName,
      email,
    },
    status: dbBuildStatusToAdmin(row.build_status),
    assignedDeveloper: row.assigned_developer?.trim() || null,
    createdDate: formatCreatedDate(row.created_at),
    createdAtIso: row.created_at,
    industry: row.industries?.name ?? "—",
    pages: parseStringList(onboardingData.pages),
    features: parseStringList(onboardingData.features),
    designStyle: parseOptionalString(onboardingData.style),
    competitors: parseCompetitors(onboardingData.competitors),
    projectGoal: parseOptionalString(onboardingData.project_goal),
    contactPhone:
      parseOptionalString(row.contact_phone) ??
      parseOptionalString(onboardingData.contact_phone),
  };
}

type CompanyTeamRow = Pick<
  CompanyWithIndustry,
  | "id"
  | "name"
  | "build_status"
  | "assigned_developer"
  | "primary_contact_name"
  | "primary_contact_email"
>;

type MembershipRoleRow = {
  user_id: string;
  role: string | null;
};

const AVATAR_GRADIENTS = [
  "from-indigo-400 to-violet-500",
  "from-blue-400 to-indigo-500",
  "from-pink-400 to-rose-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-sky-500",
  "from-violet-400 to-purple-500",
  "from-fuchsia-400 to-pink-500",
];

function normalizeNameForCompare(value: string): string {
  return value.trim().toLowerCase();
}

function initialsFromName(name: string): string {
  const pieces = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (pieces.length === 0) return "NA";
  if (pieces.length === 1) return pieces[0]!.slice(0, 2).toUpperCase();
  return `${pieces[0]![0] ?? ""}${pieces[1]![0] ?? ""}`.toUpperCase();
}

function gradientForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx]!;
}

function toDisplayRole(role: string | null | undefined): string {
  if (!role?.trim()) return "Team Member";
  return role
    .trim()
    .split(/[\s_-]+/)
    .map((token) =>
      token.length > 0
        ? `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`
        : token
    )
    .join(" ");
}

function computeAvailability(projectCount: number): AdminMemberAvailability {
  return projectCount >= 3 ? "Busy" : "Available";
}

function computeStatus(
  projectCount: number,
  membershipCount: number
): AdminMemberStatus {
  return projectCount > 0 || membershipCount > 0 ? "Active" : "Offline";
}

function projectStageToAdmin(raw: string | null | undefined): AdminPipelineStatus {
  switch (raw) {
    case "in_progress":
      return "in_progress";
    case "review":
      return "in_review";
    case "completed":
      return "completed";
    default:
      return "pending";
  }
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function shortRelativeTime(iso: string): string {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return "now";
  const diffMs = Date.now() - at;
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatJoinedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function projectStatusToClientLabel(
  status: string | null | undefined
): AdminClientProject["status"] {
  switch (status) {
    case "completed":
      return "Completed";
    case "review":
    case "in_review":
      return "In Review";
    case "in_progress":
    case "in-progress":
      return "In Progress";
    default:
      return "Pending";
  }
}

export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }
  return isPlatformAdminUser(supabase, user.id);
}

export async function getAdminSessionProfile(): Promise<{
  adminEmail: string | null;
  adminDisplayName: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "Super Admin");

  return {
    adminEmail: user?.email ?? null,
    adminDisplayName,
  };
}

function emptyPlatformOverviewMetrics(): AdminPlatformOverviewMetrics {
  return {
    businesses: {
      total: 0,
      active: 0,
      trial: 0,
      suspended: 0,
      newThisMonth: 0,
    },
    users: {
      total: 0,
      active: 0,
      newThisMonth: 0,
      growthRatePercent: 0,
    },
    revenue: {
      mrr: 0,
      arr: 0,
      totalRevenue: 0,
      activeSubscriptions: 0,
      failedPayments: 0,
      churnRatePercent: 0,
    },
    operations: {
      openTickets: 0,
      urgentTickets: 0,
      pendingFeatureRequests: 0,
    },
    systemHealth: {
      api: "unknown",
      cron: "unknown",
      email: "unknown",
      queue: "unknown",
      hosting: "unknown",
      websites: "unknown",
      domains: "unknown",
      ssl: "unknown",
    },
    systemHealthIssues: [],
    infrastructure: {
      pipelineInProgress: 0,
      pipelineInReview: 0,
      pipelinePending: 0,
      pendingHostingOrders: 0,
      failedHostingOrders: 0,
      pendingAutomationJobs: 0,
      failedAutomationJobs: 0,
    },
    marketplace: {
      activeListings: 0,
      featuredListings: 0,
      marketplaceBookings30d: 0,
    },
    businessGrowthTrend: [],
    recentBusinesses: [],
    recentOpenTickets: [],
    topFeatureRequests: [],
    recentAuditEvents: [],
    pipelineStats: {
      total: 0,
      pending: 0,
      inProgress: 0,
      inReview: 0,
      completed: 0,
    },
  };
}

async function countTableRows(
  supabase: Awaited<ReturnType<typeof resolveAdminQueryClient>>,
  table: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(`[admin] count ${table}`, error.message);
    return 0;
  }

  return count ?? 0;
}

function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function resolvePlatformStatusLabel(
  subscriptionStatus: string | null | undefined,
  hostingStatus: string | null | undefined
): AdminPlatformStatus {
  if (hostingStatus === "suspended") return "Suspended";
  if (hostingStatus === "active" || subscriptionStatus === "active") return "Active";
  if (subscriptionStatus === "trial") return "Trial";
  return "Inactive";
}

/** @deprecated Use resolvePlatformStatusLabel */
function resolveBusinessStatusLabel(
  subscriptionStatus: string | null | undefined,
  hostingStatus: string | null | undefined
): string {
  return resolvePlatformStatusLabel(subscriptionStatus, hostingStatus);
}

function computeApiHealthFromLogs(
  rows: Array<{ status_code: number }>
): AdminHealthStatus {
  if (rows.length === 0) return "unknown";
  const failed = rows.filter((row) => row.status_code >= 400).length;
  const failureRate = failed / rows.length;
  if (failureRate > 0.25) return "critical";
  if (failureRate > 0.1) return "warning";
  return "healthy";
}

function computeCronHealthFromRuns(
  rows: Array<{ status: string }>
): AdminHealthStatus {
  if (rows.length === 0) return "unknown";
  if (rows[0]?.status === "failed") return "critical";
  const successes = rows.filter((row) => row.status === "success").length;
  const successRate = successes / rows.length;
  if (successRate < 0.8) return "warning";
  return "healthy";
}

function computeEmailHealthFromLogs(
  rows: Array<{ status: string }>
): AdminHealthStatus {
  if (rows.length === 0) return "unknown";
  const failed = rows.filter((row) => row.status === "failed").length;
  const failureRate = failed / rows.length;
  if (failureRate > 0.1) return "critical";
  if (failureRate > 0.03) return "warning";
  return "healthy";
}

function computeQueueHealthFromJobs(
  rows: Array<{ status: string }>
): AdminHealthStatus {
  if (rows.length === 0) return "healthy";
  const failed = rows.filter((row) => row.status === "failed").length;
  const pending = rows.filter((row) => row.status === "pending").length;
  if (failed > 0) return "critical";
  if (pending > 25) return "warning";
  return "healthy";
}

function computeHostingHealthFromOrders(
  rows: Array<{ status: string }>
): AdminHealthStatus {
  if (rows.length === 0) return "healthy";
  const failed = rows.filter((row) => row.status === "failed").length;
  const stuck = rows.filter(
    (row) => row.status === "pending" || row.status === "provisioning"
  ).length;
  if (failed > 0) return "critical";
  if (stuck > 10) return "warning";
  return "healthy";
}

function computeSslHealthFromDomains(
  rows: Array<{ ssl_status: string }>
): AdminHealthStatus {
  if (rows.length === 0) return "unknown";
  const failed = rows.filter((row) => row.ssl_status === "failed").length;
  const pending = rows.filter(
    (row) => row.ssl_status === "pending" || row.ssl_status === "provisioning"
  ).length;
  if (failed > 0) return "critical";
  if (pending > 0) return "warning";
  return "healthy";
}

function summarizeEmailFailureMessage(message: string | null | undefined): string {
  if (!message) return "Recent outbound emails are failing.";
  if (/only send testing emails to your own email address/i.test(message)) {
    return "Resend sandbox mode: verify a domain or set RESEND_SANDBOX_TO for local delivery.";
  }
  if (/missing resend_api_key/i.test(message)) {
    return "Missing RESEND_API_KEY or BOOKING_FROM_EMAIL.";
  }
  return message.slice(0, 180);
}

function isResendSandboxEmailError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /only send testing emails|sandbox mode|RESEND_SANDBOX/i.test(message);
}

function isPleskCredentialError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /incorrect username or password|authentication failed|invalid credentials|unauthorized/i.test(
    message
  );
}

function buildSystemHealthIssues(input: {
  apiHealth: AdminHealthStatus;
  cronHealth: AdminHealthStatus;
  emailHealth: AdminHealthStatus;
  queueHealth: AdminHealthStatus;
  hostingHealth: AdminHealthStatus;
  websiteHealth: AdminHealthStatus;
  domainHealth: AdminHealthStatus;
  sslHealth: AdminHealthStatus;
  emailFailedCount: number;
  emailSampleCount: number;
  latestEmailError?: string | null;
  failedHostingOrders: Array<{
    id: string;
    domain_name: string;
    errorMessage?: string | null;
  }>;
  pendingDomains: string[];
  failedSslDomains: string[];
  pendingAutomationJobs: number;
  failedAutomationJobs: number;
}): AdminHealthIssue[] {
  const issues: AdminHealthIssue[] = [];

  if (input.emailHealth === "critical" || input.emailHealth === "warning") {
    const rate =
      input.emailSampleCount > 0
        ? Math.round((input.emailFailedCount / input.emailSampleCount) * 100)
        : 0;
    const emailFixActions: AdminHealthIssue["fixActions"] = [];
    if (input.emailFailedCount > 0) {
      emailFixActions.push({ kind: "clear_failed_emails", label: "Clear failed logs" });
    }
    if (isResendSandboxEmailError(input.latestEmailError)) {
      emailFixActions.push({
        kind: "link",
        href: "/admin/emails",
        label: "View setup guide",
      });
    }
    issues.push({
      key: "email",
      label: "Email",
      status: input.emailHealth,
      summary:
        input.emailSampleCount > 0
          ? `${input.emailFailedCount}/${input.emailSampleCount} recent emails failed (${rate}%). ${summarizeEmailFailureMessage(input.latestEmailError)}`
          : summarizeEmailFailureMessage(input.latestEmailError),
      actionHref: "/admin/emails",
      actionLabel: "View email logs",
      fixActions: emailFixActions.length > 0 ? emailFixActions : undefined,
    });
  }

  if (input.hostingHealth === "critical" || input.hostingHealth === "warning") {
    const failedSummary = input.failedHostingOrders
      .slice(0, 2)
      .map((order) =>
        order.errorMessage
          ? `${order.domain_name}: ${order.errorMessage.slice(0, 100)}`
          : order.domain_name
      )
      .join("; ");
    const hostingFixActions: AdminHealthIssue["fixActions"] = [];
    const hasCredentialError = input.failedHostingOrders.some((order) =>
      isPleskCredentialError(order.errorMessage)
    );
    if (hasCredentialError) {
      hostingFixActions.push({
        kind: "link",
        href: "/admin/hosting/settings",
        label: "Fix credentials",
      });
    }
    const failedOrderIds = input.failedHostingOrders.map((order) => order.id);
    if (failedOrderIds.length > 0) {
      hostingFixActions.push({
        kind: "retry_hosting_orders",
        orderIds: failedOrderIds,
        label:
          failedOrderIds.length === 1 ? "Retry provisioning" : `Retry ${failedOrderIds.length} orders`,
      });
      hostingFixActions.push({
        kind: "remove_hosting_orders",
        orderIds: failedOrderIds,
        label:
          failedOrderIds.length === 1 ? "Remove order" : `Remove ${failedOrderIds.length} orders`,
      });
    }
    issues.push({
      key: "hosting",
      label: "Hosting",
      status: input.hostingHealth,
      summary:
        input.failedHostingOrders.length > 0
          ? `${input.failedHostingOrders.length} failed order${input.failedHostingOrders.length === 1 ? "" : "s"}. ${failedSummary}`
          : `${input.pendingAutomationJobs} hosting orders still provisioning.`,
      actionHref: "/admin/hosting/orders",
      actionLabel: "Review hosting",
      fixActions: hostingFixActions.length > 0 ? hostingFixActions : undefined,
    });
  }

  if (input.domainHealth === "critical" || input.domainHealth === "warning") {
    issues.push({
      key: "domains",
      label: "Domains",
      status: input.domainHealth,
      summary:
        input.pendingDomains.length > 0
          ? `${input.pendingDomains.length} domain${input.pendingDomains.length === 1 ? "" : "s"} awaiting DNS verification: ${input.pendingDomains.slice(0, 3).join(", ")}.`
          : `${input.failedSslDomains.length} domain${input.failedSslDomains.length === 1 ? "" : "s"} with SSL failures.`,
      actionHref: "/admin/websites",
      actionLabel: "Review domains",
    });
  }

  if (input.sslHealth === "critical" || input.sslHealth === "warning") {
    issues.push({
      key: "ssl",
      label: "SSL",
      status: input.sslHealth,
      summary:
        input.failedSslDomains.length > 0
          ? `SSL failed for ${input.failedSslDomains.slice(0, 3).join(", ")}.`
          : "One or more domains still have SSL provisioning in progress.",
      actionHref: "/admin/websites",
      actionLabel: "Review SSL",
    });
  }

  if (input.queueHealth === "critical" || input.queueHealth === "warning") {
    issues.push({
      key: "queue",
      label: "Queue",
      status: input.queueHealth,
      summary:
        input.failedAutomationJobs > 0
          ? `${input.failedAutomationJobs} automation job${input.failedAutomationJobs === 1 ? "" : "s"} failed.`
          : `${input.pendingAutomationJobs} automation jobs pending.`,
      actionHref: "/admin/cron",
      actionLabel: "Review queue",
    });
  }

  if (input.apiHealth === "critical" || input.apiHealth === "warning") {
    issues.push({
      key: "api",
      label: "API",
      status: input.apiHealth,
      summary: "Elevated API error rate in recent platform requests.",
      actionHref: "/admin/api-usage",
      actionLabel: "View API usage",
    });
  }

  if (input.cronHealth === "critical" || input.cronHealth === "warning") {
    issues.push({
      key: "cron",
      label: "Cron",
      status: input.cronHealth,
      summary: "Recent scheduled jobs failed or are running below target success rate.",
      actionHref: "/admin/cron",
      actionLabel: "View cron runs",
    });
  }

  if (input.websiteHealth === "warning") {
    issues.push({
      key: "websites",
      label: "Websites",
      status: input.websiteHealth,
      summary: "Fewer than half of tracked websites are published.",
      actionHref: "/admin/websites",
      actionLabel: "Review websites",
    });
  }

  return issues;
}

function computePipelineStatsFromCompanies(
  rows: Array<{ build_status?: string | null }>
): AdminProjectStats {
  const stats: AdminProjectStats = {
    total: rows.length,
    pending: 0,
    inProgress: 0,
    inReview: 0,
    completed: 0,
  };

  for (const row of rows) {
    const status = dbBuildStatusToAdmin(row.build_status);
    if (status === "pending") stats.pending += 1;
    else if (status === "in_progress") stats.inProgress += 1;
    else if (status === "in_review") stats.inReview += 1;
    else if (status === "completed") stats.completed += 1;
  }

  return stats;
}

function buildBusinessGrowthTrend(
  companyRows: Array<{ created_at: string }>,
  now: Date
): AdminAnalyticsPoint[] {
  const months: AdminAnalyticsPoint[] = [];
  const monthIndexByKey = new Map<string, number>();

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthIndexByKey.set(monthKeyFromDate(date), months.length);
    months.push({ label: monthLabel(date), value: 0 });
  }

  for (const company of companyRows) {
    const key = monthKeyFromDate(new Date(company.created_at));
    const index = monthIndexByKey.get(key);
    if (index !== undefined) {
      months[index]!.value += 1;
    }
  }

  return months;
}

/**
 * Platform-wide KPIs for the admin Overview dashboard.
 */
export async function getPlatformOverviewMetrics(): Promise<AdminPlatformOverviewMetrics> {
  const cached = getCachedPlatformOverviewMetrics();
  if (cached) return cached;

  const snapshot = await getLatestPlatformOverviewSnapshot();
  if (snapshot) {
    setCachedPlatformOverviewMetrics(snapshot);
    return snapshot;
  }

  const metrics = await fetchPlatformOverviewMetricsUncached();
  setCachedPlatformOverviewMetrics(metrics);
  void savePlatformOverviewSnapshot(metrics);
  return metrics;
}

async function fetchPlatformOverviewMetricsUncached(): Promise<AdminPlatformOverviewMetrics> {
  const empty = emptyPlatformOverviewMetrics();
  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const platformAdminIds = await getPlatformAdminUserIds(supabase);
  const now = new Date();
  const thisMonthKey = monthKeyFromDate(now);
  const lastMonthKey = monthKeyFromDate(
    new Date(now.getFullYear(), now.getMonth() - 1, 1)
  );
  const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    companiesResult,
    usersResult,
    hostingSubsResult,
    hostingPaymentsResult,
    websitesResult,
    domainsResult,
    recentCompaniesResult,
    apiLogsResult,
    cronRunsResult,
    emailLogsResult,
    automationJobsResult,
    hostingOrdersResult,
    marketplaceBookingsResult,
    auditLogsResult,
    openTicketsResult,
    recentOpenTicketsResult,
    pendingFeatureRequestsResult,
    topFeatureRequestsResult,
    hostingProvisioningLogsResult,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select(
        "id,created_at,subscription_status,build_status,plan,name,listed_in_marketplace,marketplace_featured,industries(name)"
      ),
    supabase.from("users").select("id,created_at"),
    supabase.from("hosting_subscriptions").select("company_id,status,plan_slug"),
    supabase
      .from("hosting_payments")
      .select("amount_cents,status,created_at"),
    supabase.from("websites").select("status"),
    supabase.from("website_domains").select("domain,verification_status,ssl_status"),
    supabase
      .from("companies")
      .select("id,name,created_at,plan,subscription_status,industries(name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("platform_api_logs")
      .select("status_code")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("platform_cron_runs")
      .select("status")
      .order("started_at", { ascending: false })
      .limit(50),
    supabase
      .from("platform_email_logs")
      .select("status,error_message")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("automation_jobs").select("status"),
    supabase.from("hosting_orders").select("id,status,domain_name"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("source", "marketplace")
      .gte("created_at", thirtyDaysAgoIso),
    supabase
      .from("platform_audit_logs")
      .select("id,actor_email,action,target_type,target_label,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("platform_support_tickets")
      .select("status,priority")
      .in("status", ["open", "in_progress", "waiting"]),
    supabase
      .from("platform_support_tickets")
      .select("id,ticket_number,subject,status,priority,updated_at")
      .in("status", ["open", "in_progress", "waiting"])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("platform_feature_requests")
      .select("status")
      .in("status", ["submitted", "under_review"]),
    supabase
      .from("platform_feature_requests")
      .select("id,title,vote_count,status")
      .in("status", ["submitted", "under_review", "planned", "in_progress"])
      .order("vote_count", { ascending: false })
      .limit(5),
    supabase
      .from("hosting_provisioning_logs")
      .select("order_id,error_message,created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (companiesResult.error) {
    console.error("[admin] getPlatformOverviewMetrics companies", companiesResult.error.message);
    return empty;
  }

  type CompanyOverviewRow = {
    id: string;
    created_at: string;
    subscription_status?: string | null;
    build_status?: string | null;
    plan?: string | null;
    name?: string | null;
    listed_in_marketplace?: boolean | null;
    marketplace_featured?: boolean | null;
    industries?: { name?: string | null } | null;
  };

  const companyRows = (companiesResult.data ?? []) as CompanyOverviewRow[];
  const hostingByCompany = new Map<string, string>();
  for (const row of (hostingSubsResult.data ?? []) as Array<{
    company_id: string;
    status: string;
  }>) {
    hostingByCompany.set(row.company_id, row.status);
  }

  let activeBusinesses = 0;
  let trialBusinesses = 0;
  let suspendedBusinesses = 0;
  let newBusinessesThisMonth = 0;

  for (const company of companyRows) {
    const created = new Date(company.created_at);
    if (monthKeyFromDate(created) === thisMonthKey) {
      newBusinessesThisMonth += 1;
    }

    const hostingStatus = hostingByCompany.get(company.id) ?? null;
    const subscriptionStatus = company.subscription_status ?? "inactive";

    if (hostingStatus === "suspended") {
      suspendedBusinesses += 1;
      continue;
    }
    if (subscriptionStatus === "trial") {
      trialBusinesses += 1;
      continue;
    }
    if (
      hostingStatus === "active" ||
      subscriptionStatus === "active" ||
      dbBuildStatusToAdmin(company.build_status) !== "pending"
    ) {
      activeBusinesses += 1;
    }
  }

  const userRows = usersResult.error
    ? []
    : ((usersResult.data ?? []) as Array<{ id: string; created_at: string }>).filter(
        (user) => !platformAdminIds.has(user.id)
      );
  if (usersResult.error) {
    console.error("[admin] getPlatformOverviewMetrics users", usersResult.error.message);
  }

  let usersThisMonth = 0;
  let usersLastMonth = 0;
  for (const user of userRows) {
    const key = monthKeyFromDate(new Date(user.created_at));
    if (key === thisMonthKey) usersThisMonth += 1;
    if (key === lastMonthKey) usersLastMonth += 1;
  }

  const userGrowthRatePercent =
    usersLastMonth > 0
      ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
      : usersThisMonth > 0
        ? 100
        : 0;

  const hostingSubs = hostingSubsResult.error
    ? []
    : ((hostingSubsResult.data ?? []) as Array<{ status: string; plan_slug: string }>);
  if (hostingSubsResult.error) {
    console.error(
      "[admin] getPlatformOverviewMetrics hosting_subscriptions",
      hostingSubsResult.error.message
    );
  }

  let mrr = 0;
  let activeSubscriptions = 0;
  let cancelledCount = 0;
  for (const sub of hostingSubs) {
    if (sub.status === "active") {
      activeSubscriptions += 1;
      const plan = pricingPlans.find((p) => p.slug === normalizePlanSlug(sub.plan_slug));
      mrr += plan?.monthly_price ?? 0;
    }
    if (sub.status === "cancelled") cancelledCount += 1;
  }

  const churnRatePercent =
    hostingSubs.length > 0 ? Math.round((cancelledCount / hostingSubs.length) * 100) : 0;

  const hostingPayments = hostingPaymentsResult.error
    ? []
    : ((hostingPaymentsResult.data ?? []) as Array<{
        amount_cents: number;
        status: string;
        created_at: string;
      }>);
  if (hostingPaymentsResult.error) {
    console.error(
      "[admin] getPlatformOverviewMetrics hosting_payments",
      hostingPaymentsResult.error.message
    );
  }

  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  let totalRevenue = 0;
  let failedPayments = 0;
  for (const payment of hostingPayments) {
    if (payment.status === "success") {
      totalRevenue += payment.amount_cents / 100;
    }
    if (
      payment.status === "failed" &&
      new Date(payment.created_at).getTime() >= thirtyDaysAgo
    ) {
      failedPayments += 1;
    }
  }

  let activeListings = 0;
  let featuredListings = 0;
  for (const company of companyRows) {
    if (company.listed_in_marketplace) activeListings += 1;
    if (company.marketplace_featured) featuredListings += 1;
  }

  const websiteRows = websitesResult.error
    ? []
    : ((websitesResult.data ?? []) as Array<{ status: string }>);
  const domainRows = domainsResult.error
    ? []
    : ((domainsResult.data ?? []) as Array<{
        domain: string;
        verification_status: string;
        ssl_status: string;
      }>);

  let websiteHealth: AdminHealthStatus = "unknown";
  if (websiteRows.length > 0) {
    const published = websiteRows.filter((w) => w.status === "published").length;
    const ratio = published / websiteRows.length;
    websiteHealth = ratio >= 0.5 ? "healthy" : "warning";
  }

  let domainHealth: AdminHealthStatus = "unknown";
  if (domainRows.length > 0) {
    const failedSsl = domainRows.filter((d) => d.ssl_status === "failed").length;
    const pending = domainRows.filter((d) => d.verification_status === "pending").length;
    if (failedSsl > 0) domainHealth = "critical";
    else if (pending > 0) domainHealth = "warning";
    else domainHealth = "healthy";
  }

  const apiLogRows = apiLogsResult.error
    ? []
    : ((apiLogsResult.data ?? []) as Array<{ status_code: number }>);
  const cronRunRows = cronRunsResult.error
    ? []
    : ((cronRunsResult.data ?? []) as Array<{ status: string }>);
  const emailLogRows = emailLogsResult.error
    ? []
    : ((emailLogsResult.data ?? []) as Array<{ status: string; error_message?: string | null }>);
  const automationJobRows = automationJobsResult.error
    ? []
    : ((automationJobsResult.data ?? []) as Array<{ status: string }>);
  const hostingOrderRows = hostingOrdersResult.error
    ? []
    : ((hostingOrdersResult.data ?? []) as Array<{
        id: string;
        status: string;
        domain_name: string;
      }>);
  const hostingProvisioningLogRows = hostingProvisioningLogsResult.error
    ? []
    : ((hostingProvisioningLogsResult.data ?? []) as Array<{
        order_id: string | null;
        error_message: string | null;
        created_at: string;
      }>);

  const apiHealth = computeApiHealthFromLogs(apiLogRows);
  const cronHealth = computeCronHealthFromRuns(cronRunRows);
  const emailHealth =
    emailLogRows.length > 0 ? computeEmailHealthFromLogs(emailLogRows) : "unknown";
  const queueHealth = computeQueueHealthFromJobs(automationJobRows);
  const hostingHealth = computeHostingHealthFromOrders(hostingOrderRows);
  const sslHealth = computeSslHealthFromDomains(domainRows);

  const emailFailedCount = emailLogRows.filter((row) => row.status === "failed").length;
  const latestEmailError =
    emailLogRows.find((row) => row.status === "failed")?.error_message ?? null;

  const provisioningErrorByOrderId = new Map<string, string>();
  for (const log of hostingProvisioningLogRows) {
    if (!log.order_id || !log.error_message) continue;
    if (!provisioningErrorByOrderId.has(log.order_id)) {
      provisioningErrorByOrderId.set(log.order_id, log.error_message);
    }
  }

  const failedHostingOrderDetails = hostingOrderRows
    .filter((order) => order.status === "failed")
    .map((order) => ({
      id: order.id,
      domain_name: order.domain_name,
      errorMessage: provisioningErrorByOrderId.get(order.id) ?? null,
    }));

  const pendingDomains = domainRows
    .filter((domain) => domain.verification_status === "pending")
    .map((domain) => domain.domain);

  const failedSslDomains = domainRows
    .filter((domain) => domain.ssl_status === "failed")
    .map((domain) => domain.domain);

  let pendingAutomationJobs = 0;
  let failedAutomationJobs = 0;
  for (const job of automationJobRows) {
    if (job.status === "pending") pendingAutomationJobs += 1;
    if (job.status === "failed") failedAutomationJobs += 1;
  }

  let pendingHostingOrders = 0;
  let failedHostingOrders = 0;
  for (const order of hostingOrderRows) {
    if (order.status === "pending" || order.status === "provisioning") {
      pendingHostingOrders += 1;
    }
    if (order.status === "failed") failedHostingOrders += 1;
  }

  const systemHealthIssues = buildSystemHealthIssues({
    apiHealth,
    cronHealth,
    emailHealth,
    queueHealth,
    hostingHealth,
    websiteHealth,
    domainHealth,
    sslHealth,
    emailFailedCount,
    emailSampleCount: emailLogRows.length,
    latestEmailError,
    failedHostingOrders: failedHostingOrderDetails,
    pendingDomains,
    failedSslDomains,
    pendingAutomationJobs,
    failedAutomationJobs,
  });

  const pipelineStats = computePipelineStatsFromCompanies(companyRows);
  const businessGrowthTrend = buildBusinessGrowthTrend(companyRows, now);

  const marketplaceBookings30d = marketplaceBookingsResult.error
    ? 0
    : (marketplaceBookingsResult.count ?? 0);
  if (marketplaceBookingsResult.error) {
    console.error(
      "[admin] getPlatformOverviewMetrics marketplace bookings",
      marketplaceBookingsResult.error.message
    );
  }

  const recentAuditEvents: AdminAuditLogRow[] = auditLogsResult.error
    ? []
    : ((auditLogsResult.data ?? []) as Array<{
        id: string;
        actor_email: string | null;
        action: string;
        target_type: string;
        target_label: string | null;
        created_at: string;
      }>).map((row) => ({
        id: row.id,
        actorEmail: row.actor_email,
        action: row.action,
        targetType: row.target_type,
        targetLabel: row.target_label,
        createdAt: shortDateTime(row.created_at),
      }));
  if (auditLogsResult.error) {
    console.error(
      "[admin] getPlatformOverviewMetrics audit logs",
      auditLogsResult.error.message
    );
  }

  const recentBusinesses: AdminOverviewBusinessRow[] = (
    (recentCompaniesResult.data ?? []) as CompanyOverviewRow[]
  ).map((company) => ({
    id: company.id,
    name: company.name?.trim() || "Unnamed business",
    industry: company.industries?.name?.trim() || "—",
    plan: normalizePlanSlug(company.plan) || "—",
    status: resolveBusinessStatusLabel(
      company.subscription_status,
      hostingByCompany.get(company.id) ?? null
    ),
    createdDate: formatCreatedDate(company.created_at),
  }));

  const openTicketRows = openTicketsResult.error
    ? []
    : ((openTicketsResult.data ?? []) as Array<{
        status: string;
        priority: string;
      }>);
  let openTickets = 0;
  let urgentTickets = 0;
  for (const ticket of openTicketRows) {
    openTickets += 1;
    if (ticket.priority === "urgent" || ticket.priority === "high") {
      urgentTickets += 1;
    }
  }

  const pendingFeatureRequestRows = pendingFeatureRequestsResult.error
    ? []
    : ((pendingFeatureRequestsResult.data ?? []) as Array<{ status: string }>);

  const recentOpenTickets: AdminOverviewTicketRow[] = recentOpenTicketsResult.error
    ? []
    : ((recentOpenTicketsResult.data ?? []) as Array<{
        id: string;
        ticket_number: number;
        subject: string;
        status: string;
        priority: string;
        updated_at: string;
      }>).map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status.replace(/_/g, " "),
        priority: ticket.priority,
        updatedAt: shortDateTime(ticket.updated_at),
      }));

  const topFeatureRequests: AdminOverviewFeatureRequestRow[] = topFeatureRequestsResult.error
    ? []
    : ((topFeatureRequestsResult.data ?? []) as Array<{
        id: string;
        title: string;
        vote_count: number;
        status: string;
      }>).map((request) => ({
        id: request.id,
        title: request.title,
        voteCount: request.vote_count,
        status: request.status.replace(/_/g, " "),
      }));

  return {
    businesses: {
      total: companyRows.length,
      active: activeBusinesses,
      trial: trialBusinesses,
      suspended: suspendedBusinesses,
      newThisMonth: newBusinessesThisMonth,
    },
    users: {
      total: userRows.length,
      active: userRows.length,
      newThisMonth: usersThisMonth,
      growthRatePercent: userGrowthRatePercent,
    },
    revenue: {
      mrr,
      arr: mrr * 12,
      totalRevenue,
      activeSubscriptions,
      failedPayments,
      churnRatePercent,
    },
    operations: {
      openTickets,
      urgentTickets,
      pendingFeatureRequests: pendingFeatureRequestRows.length,
    },
    systemHealth: {
      api: apiHealth,
      cron: cronHealth,
      email: emailHealth,
      queue: queueHealth,
      hosting: hostingHealth,
      websites: websiteHealth,
      domains: domainHealth,
      ssl: sslHealth,
    },
    systemHealthIssues,
    infrastructure: {
      pipelineInProgress: pipelineStats.inProgress,
      pipelineInReview: pipelineStats.inReview,
      pipelinePending: pipelineStats.pending,
      pendingHostingOrders,
      failedHostingOrders,
      pendingAutomationJobs,
      failedAutomationJobs,
    },
    marketplace: {
      activeListings,
      featuredListings,
      marketplaceBookings30d,
    },
    businessGrowthTrend,
    recentBusinesses,
    recentOpenTickets,
    topFeatureRequests,
    recentAuditEvents,
    pipelineStats,
  };
}

/**
 * All companies for the pipeline (requires `platform_admins` row for current user).
 */
export async function getAllProjects(): Promise<AdminProject[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const allowed = await isCurrentUserPlatformAdmin();
  if (!allowed) {
    return [];
  }

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `
      *,
      industries ( name, slug )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] getAllProjects", error.message);
    return [];
  }

  return ((data ?? []) as CompanyWithIndustry[]).map(companyRowToAdminProject);
}

export function computeProjectStats(
  projects: AdminProject[]
): AdminProjectStats {
  return {
    total: projects.length,
    pending: projects.filter((p) => p.status === "pending").length,
    inProgress: projects.filter((p) => p.status === "in_progress").length,
    inReview: projects.filter((p) => p.status === "in_review").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };
}

/**
 * Aggregate counts for the stats row (same rules as {@link getAllProjects}).
 */
export async function getProjectStats(): Promise<AdminProjectStats> {
  const projects = await getAllProjects();
  return computeProjectStats(projects);
}

export async function getAdminTeamMembers(): Promise<AdminTeamMember[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const allowed = await isCurrentUserPlatformAdmin();
  if (!allowed) {
    return [];
  }

  const supabase = await resolveAdminQueryClient();
  const [
    { data: platformAdmins, error: adminsError },
    { data: companies, error: companiesError },
  ] = await Promise.all([
    supabase.from("platform_admins").select("user_id"),
    supabase.from("companies").select("id,assigned_developer"),
  ]);

  if (adminsError) {
    console.error("[admin] getAdminTeamMembers admins", adminsError.message);
  }
  if (companiesError) {
    console.error("[admin] getAdminTeamMembers companies", companiesError.message);
  }

  const adminUserIds = new Set(
    (platformAdmins ?? []).map((row) => (row as { user_id: string }).user_id)
  );

  const companiesByAssignee = new Map<string, number>();
  for (const company of (companies ?? []) as Array<{ assigned_developer: string | null }>) {
    const assignee = company.assigned_developer?.trim();
    if (!assignee) continue;
    const key = normalizeNameForCompare(assignee);
    companiesByAssignee.set(key, (companiesByAssignee.get(key) ?? 0) + 1);
  }

  let users: AppUser[] = [];
  if (adminUserIds.size > 0) {
    const { data: adminUsers, error: usersError } = await supabase
      .from("users")
      .select("id,email,full_name")
      .in("id", Array.from(adminUserIds));

    if (usersError) {
      console.error("[admin] getAdminTeamMembers users", usersError.message);
    } else {
      users = (adminUsers ?? []) as AppUser[];
    }
  }

  const members: AdminTeamMember[] = [];
  const seenNameKeys = new Set<string>();

  for (const user of users) {
    const name =
      user.full_name?.trim() || user.email.split("@")[0]?.trim() || "Unknown";
    const key = normalizeNameForCompare(name);
    seenNameKeys.add(key);
    const projectCount = companiesByAssignee.get(key) ?? 0;
    members.push({
      id: user.id,
      name,
      email: user.email,
      role: "Admin",
      status: computeStatus(projectCount, 0),
      availability: computeAvailability(projectCount),
      projectCount,
      avatarInitials: initialsFromName(name),
      avatarGradient: gradientForId(user.id),
    });
  }

  for (const dev of ADMIN_DEVELOPER_OPTIONS) {
    const key = normalizeNameForCompare(dev.name);
    if (seenNameKeys.has(key)) continue;
    seenNameKeys.add(key);
    const projectCount = companiesByAssignee.get(key) ?? 0;
    members.push({
      id: `dev-${dev.id}`,
      name: dev.name,
      email: "Internal developer",
      role: "Developer",
      status: computeStatus(projectCount, 0),
      availability: computeAvailability(projectCount),
      projectCount,
      avatarInitials: initialsFromName(dev.name),
      avatarGradient: gradientForId(dev.id),
    });
  }

  for (const [assigneeKey, projectCount] of companiesByAssignee.entries()) {
    if (seenNameKeys.has(assigneeKey)) continue;
    const displayName = assigneeKey
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    seenNameKeys.add(assigneeKey);
    members.push({
      id: `assignee-${assigneeKey.replace(/\s+/g, "-")}`,
      name: displayName,
      email: "Assigned on projects",
      role: "Developer",
      status: computeStatus(projectCount, 0),
      availability: computeAvailability(projectCount),
      projectCount,
      avatarInitials: initialsFromName(displayName),
      avatarGradient: gradientForId(assigneeKey),
    });
  }

  return members.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAdminAssignableProjects(): Promise<AdminAssignableProject[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const allowed = await isCurrentUserPlatformAdmin();
  if (!allowed) {
    return [];
  }

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,primary_contact_name,primary_contact_email,build_status")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] getAdminAssignableProjects", error.message);
    return [];
  }

  return ((data ?? []) as CompanyTeamRow[]).map((row) => {
    const fallbackEmail = row.primary_contact_email?.trim() ?? "";
    const fallbackName =
      row.primary_contact_name?.trim() ||
      (fallbackEmail ? fallbackEmail.split("@")[0] : null) ||
      "Unknown client";
    return {
      id: row.id,
      name: row.name,
      client: fallbackName,
      status: dbBuildStatusToAdmin(row.build_status),
    };
  });
}

export async function getAdminProjectDetails(
  companyId: string
): Promise<AdminProjectDetails | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const allowed = await isCurrentUserPlatformAdmin();
  if (!allowed) {
    return null;
  }

  const supabase = await resolveAdminQueryClient();
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*, industries ( name, slug )")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    console.error("[admin] getAdminProjectDetails company", companyError.message);
    return null;
  }
  if (!company) {
    return null;
  }

  const row = company as CompanyWithIndustry;
  const base = companyRowToAdminProject(row);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, progress, created_at")
    .eq("company_id", companyId)
    .maybeSingle();

  if (projectError) {
    console.error("[admin] getAdminProjectDetails project", projectError.message);
  }

  let activities: AdminProjectActivity[] = [];
  if (project?.id) {
    const { data: activityRows, error: activityError } = await supabase
      .from("project_activities")
      .select("id, title, stage, completed, created_at")
      .eq("project_id", project.id as string)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (activityError) {
      console.error(
        "[admin] getAdminProjectDetails activities",
        activityError.message
      );
    } else {
      activities = (activityRows ?? []).map((entry) => ({
        id: entry.id as string,
        title: entry.title as string,
        stage: projectStageToAdmin(entry.stage as string | null | undefined),
        completed: Boolean(entry.completed),
        createdAtIso:
          (entry.created_at as string | null) ??
          (project.created_at as string) ??
          row.created_at,
      }));
    }
  }

  const numericProgress =
    typeof project?.progress === "number"
      ? Math.min(100, Math.max(0, Math.round(project.progress)))
      : base.status === "completed"
        ? 100
        : base.status === "in_review"
          ? 85
          : base.status === "in_progress"
            ? 65
            : 20;

  const { data: noteRows, error: notesError } = await supabase
    .from("admin_company_notes")
    .select("id, author_name, body, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (notesError) {
    console.error("[admin] getAdminProjectDetails notes", notesError.message);
  }

  const notes: AdminCompanyNote[] = (noteRows ?? []).map((entry) => ({
    id: entry.id as string,
    authorName: entry.author_name as string,
    body: entry.body as string,
    createdAtIso: entry.created_at as string,
  }));

  const { data: website } = await supabase
    .from("websites")
    .select("id, status")
    .eq("client_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const onboardingData = (row.onboarding_data ?? {}) as CompanyOnboardingData;

  return {
    ...base,
    companyId: row.id,
    industryId: row.industry_id ?? null,
    plan: row.plan?.trim() ?? null,
    deadline:
      parseOptionalString(onboardingData.deadline) ??
      row.next_billing_date ??
      null,
    projectProgress: numericProgress,
    websiteId: (website?.id as string | undefined) ?? null,
    listedInMarketplace: Boolean(row.listed_in_marketplace),
    marketplaceSummary: row.marketplace_summary?.trim() ?? null,
    marketplaceLocation: row.marketplace_location?.trim() ?? null,
    marketplaceFeatured: Boolean(row.marketplace_featured),
    websitePublished: website?.status === "published",
    activities,
    notes,
  };
}

type AnalyticsCompanyRow = {
  id: string;
  name: string;
  created_at: string;
  build_status: string | null;
  assigned_developer: string | null;
  plan: string | null;
};

type AnalyticsProjectRow = {
  id: string;
  company_id: string;
  progress: number;
  status: string;
};

type AnalyticsActivityRow = {
  id: string;
  project_id: string;
  title: string;
  stage: string;
  created_at: string;
};

export async function getAdminAnalyticsData(): Promise<AdminAnalyticsData> {
  const empty: AdminAnalyticsData = {
    monthLabel: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    totalProjects: 0,
    completedProjects: 0,
    activeClients: 0,
    revenueTotal: 0,
    projectsOverTime: [],
    developerWorkload: [],
    statusBreakdown: [
      { name: "Pending", value: 0, color: "#f59e0b" },
      { name: "In Progress", value: 0, color: "#3b82f6" },
      { name: "In Review", value: 0, color: "#8b5cf6" },
      { name: "Completed", value: 0, color: "#10b981" },
    ],
    monthlyRevenue: [],
    topDevelopers: [],
    activityLog: [],
  };

  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const [{ data: companies, error: companiesError },
    { data: projects, error: projectsError },
    { data: activities, error: activitiesError },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id,name,created_at,build_status,assigned_developer,plan")
      .order("created_at", { ascending: true }),
    supabase.from("projects").select("id,company_id,progress,status"),
    supabase
      .from("project_activities")
      .select("id,project_id,title,stage,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (companiesError) {
    console.error("[admin] getAdminAnalytics companies", companiesError.message);
    return empty;
  }
  if (projectsError) {
    console.error("[admin] getAdminAnalytics projects", projectsError.message);
  }
  if (activitiesError) {
    console.error("[admin] getAdminAnalytics activities", activitiesError.message);
  }

  const companyRows = (companies ?? []) as AnalyticsCompanyRow[];
  const projectRows = projectsError ? [] : ((projects ?? []) as AnalyticsProjectRow[]);
  const activityRows = activitiesError
    ? []
    : ((activities ?? []) as AnalyticsActivityRow[]);

  const now = new Date();
  const months: { key: string; label: string; date: Date }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: monthLabel(d), date: d });
  }
  const monthKeys = new Set(months.map((m) => m.key));

  const createdCountByMonth = new Map<string, number>();
  const revenueByMonth = new Map<string, number>();
  let revenueTotal = 0;

  for (const company of companyRows) {
    const created = new Date(company.created_at);
    const key = monthKey(created);
    createdCountByMonth.set(key, (createdCountByMonth.get(key) ?? 0) + 1);

    const plan = pricingPlans.find((p) => p.slug === normalizePlanSlug(company.plan));
    const setupRevenue = plan?.setup_price ?? 0;
    revenueTotal += setupRevenue;
    if (monthKeys.has(key)) {
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + setupRevenue);
    }
  }

  let runningTotal = companyRows.filter(
    (company) => new Date(company.created_at) < months[0]!.date
  ).length;
  const projectsOverTime = months.map((m) => {
    runningTotal += createdCountByMonth.get(m.key) ?? 0;
    return { label: m.label, value: runningTotal };
  });

  const monthlyRevenue = months.map((m) => ({
    label: m.label,
    value: revenueByMonth.get(m.key) ?? 0,
  }));

  const totalProjects = companyRows.length;
  const completedProjects = companyRows.filter(
    (c) => dbBuildStatusToAdmin(c.build_status) === "completed"
  ).length;
  const activeClients = companyRows.filter(
    (c) => dbBuildStatusToAdmin(c.build_status) !== "pending"
  ).length;

  const statusBreakdown = [
    {
      name: "Pending",
      value: companyRows.filter((c) => dbBuildStatusToAdmin(c.build_status) === "pending").length,
      color: "#f59e0b",
    },
    {
      name: "In Progress",
      value: companyRows.filter((c) => dbBuildStatusToAdmin(c.build_status) === "in_progress").length,
      color: "#3b82f6",
    },
    {
      name: "In Review",
      value: companyRows.filter((c) => dbBuildStatusToAdmin(c.build_status) === "in_review").length,
      color: "#8b5cf6",
    },
    {
      name: "Completed",
      value: companyRows.filter((c) => dbBuildStatusToAdmin(c.build_status) === "completed").length,
      color: "#10b981",
    },
  ];

  const workloadMap = new Map<string, { projects: number; completed: number; progressSum: number }>();
  for (const company of companyRows) {
    const dev = company.assigned_developer?.trim();
    if (!dev) continue;
    const status = dbBuildStatusToAdmin(company.build_status);
    const current = workloadMap.get(dev) ?? { projects: 0, completed: 0, progressSum: 0 };
    const project = projectRows.find((p) => p.company_id === company.id);
    const progress = project?.progress ?? (status === "completed" ? 100 : status === "in_review" ? 85 : status === "in_progress" ? 60 : 20);
    current.projects += 1;
    current.completed += status === "completed" ? 1 : 0;
    current.progressSum += progress;
    workloadMap.set(dev, current);
  }

  const developerWorkload = Array.from(workloadMap.entries())
    .map(([name, stat]) => ({ name, projects: stat.projects }))
    .sort((a, b) => b.projects - a.projects || a.name.localeCompare(b.name));

  const topDevelopers: AdminAnalyticsDeveloperPoint[] = Array.from(workloadMap.entries())
    .map(([name, stat]) => {
      const avg = stat.projects > 0 ? Math.round(stat.progressSum / stat.projects) : 0;
      return {
        name,
        projects: stat.projects,
        completed: stat.completed,
        progress: avg,
        badge: stat.projects >= 3 ? "Lead" : stat.projects >= 2 ? "Senior" : "Mid",
      };
    })
    .sort((a, b) => b.projects - a.projects || b.completed - a.completed || b.progress - a.progress)
    .slice(0, 4);

  const companyNameByProjectId = new Map<string, string>();
  for (const p of projectRows) {
    const company = companyRows.find((c) => c.id === p.company_id);
    if (company) companyNameByProjectId.set(p.id, company.name);
  }

  const activityLog: AdminAnalyticsActivity[] = activityRows.map((a) => {
    const stage = projectStageToAdmin(a.stage);
    const label =
      stage === "completed"
        ? "Completed"
        : stage === "in_review"
          ? "In Review"
          : stage === "in_progress"
            ? "In Progress"
            : "Pending";
    const color =
      stage === "completed"
        ? "bg-emerald-500"
        : stage === "in_review"
          ? "bg-purple-500"
          : stage === "in_progress"
            ? "bg-blue-500"
            : "bg-amber-500";
    return {
      id: a.id,
      time: shortRelativeTime(a.created_at),
      project: companyNameByProjectId.get(a.project_id) ?? "Project",
      action: "updated to",
      status: label,
      color,
      dot: color.replace("500", "400"),
    };
  });

  return {
    monthLabel: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    totalProjects,
    completedProjects,
    activeClients,
    revenueTotal,
    projectsOverTime,
    developerWorkload,
    statusBreakdown,
    monthlyRevenue,
    topDevelopers,
    activityLog,
  };
}

type AdminClientCompanyRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
  build_status: string | null;
  plan: string | null;
  subscription_status: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  contact_phone: string | null;
  contact_location: string | null;
  admin_client_note: string | null;
  admin_client_note_updated_at: string | null;
  industries?: { name?: string | null } | null;
};

type AdminClientProjectRow = {
  id: string;
  company_id: string;
  name: string;
  status: string;
  created_at: string;
};

export async function getAdminClients(): Promise<{
  clients: AdminClient[];
  stats: AdminClientStats;
}> {
  const empty = {
    clients: [] as AdminClient[],
    stats: { total: 0, active: 0, inactive: 0, newThisMonth: 0 },
  };
  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const extendedCompanySelect =
    "id,slug,name,created_at,build_status,plan,subscription_status,primary_contact_name,primary_contact_email,contact_phone,contact_location,admin_client_note,admin_client_note_updated_at,industries(name)";
  const baseCompanySelect =
    "id,slug,name,created_at,build_status,plan,subscription_status,primary_contact_name,primary_contact_email";

  let companyRows: AdminClientCompanyRow[] = [];
  const extendedCompanies = await supabase
    .from("companies")
    .select(extendedCompanySelect)
    .order("created_at", { ascending: false });

  if (extendedCompanies.error) {
    console.error(
      "[admin] getAdminClients companies extended",
      extendedCompanies.error.message
    );
    const baseCompanies = await supabase
      .from("companies")
      .select(baseCompanySelect)
      .order("created_at", { ascending: false });
    if (baseCompanies.error) {
      console.error(
        "[admin] getAdminClients companies base",
        baseCompanies.error.message
      );
      return empty;
    }
    companyRows = ((baseCompanies.data ?? []) as Omit<
      AdminClientCompanyRow,
      | "contact_phone"
      | "contact_location"
      | "admin_client_note"
      | "admin_client_note_updated_at"
      | "industries"
    >[]).map((row) => ({
      ...row,
      contact_phone: null,
      contact_location: null,
      admin_client_note: null,
      admin_client_note_updated_at: null,
      industries: null,
    }));
  } else {
    companyRows = (extendedCompanies.data ?? []) as AdminClientCompanyRow[];
  }

  const { data: hostingRows, error: hostingError } = await supabase
    .from("hosting_subscriptions")
    .select("company_id,status,plan_slug,next_billing_date");
  if (hostingError) {
    console.error("[admin] getAdminClients hosting", hostingError.message);
  }
  const hostingByCompany = new Map<
    string,
    { status: string; plan_slug: string; next_billing_date: string | null }
  >();
  for (const row of (hostingRows ?? []) as Array<{
    company_id: string;
    status: string;
    plan_slug: string;
    next_billing_date: string | null;
  }>) {
    hostingByCompany.set(row.company_id, row);
  }

  let projectRows: AdminClientProjectRow[] = [];
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id,company_id,name,status,created_at")
    .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("[admin] getAdminClients projects", projectsError.message);
  } else {
    projectRows = (projects ?? []) as AdminClientProjectRow[];
  }

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

  const clients: AdminClient[] = companyRows.map((company) => {
    const email = company.primary_contact_email?.trim() || "unknown@client.local";
    const name = company.primary_contact_name?.trim() || email.split("@")[0] || "Unknown Client";
    const companyProjects = projectRows.filter((p) => p.company_id === company.id);
    const buildStatus = dbBuildStatusToAdmin(company.build_status);
    const status = buildStatus === "completed" ? "Inactive" : "Active";
    const joinedDate = formatJoinedDate(company.created_at);
    const note = company.admin_client_note?.trim() || null;
    const noteTime = company.admin_client_note_updated_at
      ? shortRelativeTime(company.admin_client_note_updated_at)
      : null;
    const fallbackProjectStatus = projectStatusToClientLabel(
      buildStatus === "in_progress"
        ? "in_progress"
        : buildStatus === "in_review"
          ? "review"
          : buildStatus === "completed"
            ? "completed"
            : "pending"
    );

    const subscriptionStatus = company.subscription_status ?? "inactive";
    const hosting = hostingByCompany.get(company.id);
    const planSlug = normalizePlanSlug(hosting?.plan_slug ?? company.plan);
    const platformStatus = resolvePlatformStatusLabel(
      subscriptionStatus,
      hosting?.status ?? null
    );

    return {
      id: company.id,
      slug: company.slug,
      name,
      email,
      business: company.name,
      industry: company.industries?.name?.trim() || "—",
      plan: planLabelForSlug(planSlug),
      platformStatus,
      subscriptionStatus,
      phone: company.contact_phone?.trim() || null,
      location: company.contact_location?.trim() || null,
      joined: joinedDate,
      projectCount: Math.max(companyProjects.length, 1),
      status,
      projects:
        companyProjects.length > 0
          ? companyProjects.map((p) => ({
              id: p.id,
              name: p.name,
              status: projectStatusToClientLabel(p.status),
            }))
          : [
              {
                id: company.id,
                name: company.name,
                status: fallbackProjectStatus,
              },
            ],
      note,
      noteTime,
    };
  });

  const stats: AdminClientStats = {
    total: clients.length,
    active: clients.filter(
      (c) => c.platformStatus === "Active" || c.platformStatus === "Trial"
    ).length,
    inactive: clients.filter(
      (c) => c.platformStatus === "Inactive" || c.platformStatus === "Suspended"
    ).length,
    newThisMonth: companyRows.filter((c) => {
      const d = new Date(c.created_at);
      return `${d.getFullYear()}-${d.getMonth()}` === thisMonthKey;
    }).length,
  };

  return { clients, stats };
}

function paymentRowToTransaction(
  row: {
    id: string;
    company_id: string;
    plan_slug: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
    paystack_reference: string | null;
  },
  companyName: string
): AdminRevenueTransaction {
  const status =
    row.status === "success" || row.status === "failed" || row.status === "pending"
      ? row.status
      : "pending";
  return {
    id: row.id,
    companyId: row.company_id,
    businessName: companyName,
    plan: planLabelForSlug(normalizePlanSlug(row.plan_slug)),
    amount: row.amount_cents / 100,
    currency: row.currency,
    status,
    date: formatCreatedDate(row.created_at),
    dateIso: row.created_at,
    reference: row.paystack_reference,
  };
}

function weekKey(date: Date): string {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}

function weekLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function getPlatformRevenueData(): Promise<AdminPlatformRevenueData> {
  const empty: AdminPlatformRevenueData = {
    mrr: 0,
    arr: 0,
    activeSubscriptions: 0,
    churnRatePercent: 0,
    arpa: 0,
    successfulPayments: 0,
    failedPayments: 0,
    refunds: 0,
    monthlyTrend: [],
    weeklyTrend: [],
    transactions: [],
  };

  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const [{ data: subs, error: subsError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      supabase.from("hosting_subscriptions").select("company_id,status,plan_slug"),
      supabase
        .from("hosting_payments")
        .select(
          "id,company_id,plan_slug,amount_cents,currency,status,created_at,paystack_reference,companies(name)"
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (subsError) {
    console.error("[admin] getPlatformRevenueData subs", subsError.message);
  }
  if (paymentsError) {
    console.error("[admin] getPlatformRevenueData payments", paymentsError.message);
  }

  const subRows = (subs ?? []) as Array<{ status: string; plan_slug: string }>;
  let mrr = 0;
  let activeSubscriptions = 0;
  let cancelledCount = 0;
  for (const sub of subRows) {
    if (sub.status === "active") {
      activeSubscriptions += 1;
      const plan = pricingPlans.find((p) => p.slug === normalizePlanSlug(sub.plan_slug));
      mrr += plan?.monthly_price ?? 0;
    }
    if (sub.status === "cancelled") cancelledCount += 1;
  }

  const totalSubs = subRows.length;
  const churnRatePercent =
    totalSubs > 0 ? Math.round((cancelledCount / totalSubs) * 100) : 0;
  const arpa = activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0;

  const paymentRows = (payments ?? []) as Array<{
    id: string;
    company_id: string;
    plan_slug: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
    paystack_reference: string | null;
    companies?: { name?: string | null } | null;
  }>;

  let successfulPayments = 0;
  let failedPayments = 0;
  const now = new Date();
  const months: { key: string; label: string; date: Date }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: monthKeyFromDate(d),
      label: monthLabel(d),
      date: d,
    });
  }
  const monthKeys = new Set(months.map((m) => m.key));
  const revenueByMonth = new Map<string, number>();
  const revenueByWeek = new Map<string, number>();
  const weekLabels = new Map<string, string>();

  for (let i = 7; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = weekKey(d);
    weekLabels.set(key, weekLabel(d));
    revenueByWeek.set(key, 0);
  }

  for (const payment of paymentRows) {
    if (payment.status === "success") {
      successfulPayments += 1;
      const amount = payment.amount_cents / 100;
      const created = new Date(payment.created_at);
      const monthKey = monthKeyFromDate(created);
      if (monthKeys.has(monthKey)) {
        revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) ?? 0) + amount);
      }
      const wKey = weekKey(created);
      if (revenueByWeek.has(wKey)) {
        revenueByWeek.set(wKey, (revenueByWeek.get(wKey) ?? 0) + amount);
      }
    }
    if (payment.status === "failed") failedPayments += 1;
  }

  const transactions = paymentRows.slice(0, 50).map((row) =>
    paymentRowToTransaction(row, row.companies?.name?.trim() || "Unknown business")
  );

  return {
    mrr,
    arr: mrr * 12,
    activeSubscriptions,
    churnRatePercent,
    arpa,
    successfulPayments,
    failedPayments,
    refunds: 0,
    monthlyTrend: months.map((m) => ({
      label: m.label,
      value: revenueByMonth.get(m.key) ?? 0,
    })),
    weeklyTrend: [...revenueByWeek.entries()].map(([key, value]) => ({
      label: weekLabels.get(key) ?? key,
      value,
    })),
    transactions,
  };
}

export async function getAdminPlatformUsers(): Promise<{
  users: AdminPlatformUserRow[];
  stats: AdminPlatformUserStats;
}> {
  const empty = {
    users: [] as AdminPlatformUserRow[],
    stats: { total: 0, active: 0, owners: 0, newThisMonth: 0 },
  };
  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const platformAdminIds = await getPlatformAdminUserIds(supabase);
  const { data: membershipRows, error } = await supabase
    .from("memberships")
    .select("id,user_id,role,created_at,companies(id,name,subscription_status)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] getAdminPlatformUsers", error.message);
    return empty;
  }

  type MembershipRow = {
    id: string;
    user_id: string;
    role: string | null;
    created_at: string;
    companies?: {
      id: string;
      name: string;
      subscription_status?: string | null;
    } | null;
    user?: {
      id: string;
      email: string;
      full_name: string | null;
      created_at: string;
    } | null;
  };

  const rawRows = (membershipRows ?? []) as unknown as Array<
    Omit<MembershipRow, "user" | "companies"> & {
      companies?:
        | MembershipRow["companies"]
        | NonNullable<MembershipRow["companies"]>[]
        | null;
    }
  >;

  const userIds = [
    ...new Set(
      rawRows.map((row) => row.user_id).filter((id): id is string => Boolean(id))
    ),
  ];

  const userById = new Map<
    string,
    { id: string; email: string; full_name: string | null; created_at: string }
  >();

  if (userIds.length) {
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id,email,full_name,created_at")
      .in("id", userIds);

    if (usersError) {
      console.error("[admin] getAdminPlatformUsers users lookup", usersError.message);
    } else {
      for (const user of usersData ?? []) {
        userById.set(user.id as string, user as {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        });
      }
    }
  }

  const rows: MembershipRow[] = [];
  const byUser = new Map<string, MembershipRow[]>();
  for (const rawRow of rawRows) {
    const row: MembershipRow = {
      ...rawRow,
      user: userById.get(rawRow.user_id) ?? null,
      companies: Array.isArray(rawRow.companies)
        ? rawRow.companies[0] ?? null
        : rawRow.companies,
    };
    if (!row.user_id) continue;
    rows.push(row);
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const now = new Date();
  const thisMonthKey = monthKeyFromDate(now);

  const users: AdminPlatformUserRow[] = [...byUser.entries()]
    .filter(([userId]) => !platformAdminIds.has(userId))
    .map(([userId, memberships]) => {
    const primary = memberships[0]!;
    const user = primary.user;
    const company = primary.companies;
    const email = user?.email?.trim() || "unknown@user.local";
    const name = user?.full_name?.trim() || email.split("@")[0] || "User";
    const subscriptionStatus = company?.subscription_status ?? "inactive";

    return {
      id: userId,
      name,
      email,
      businessId: company?.id ?? null,
      businessName: company?.name?.trim() || "—",
      role: primary.role?.trim() || "member",
      status: subscriptionStatus === "suspended" ? "Inactive" : "Active",
      joined: formatJoinedDate(user?.created_at ?? primary.created_at),
      membershipCount: memberships.length,
    };
  });

  users.sort((a, b) => a.name.localeCompare(b.name));

  const stats: AdminPlatformUserStats = {
    total: users.length,
    active: users.filter((u) => u.status === "Active").length,
    owners: users.filter((u) => u.role === "owner").length,
    newThisMonth: users.filter((u) => {
      const primaryMembership = rows.find((r) => r.user_id === u.id);
      const created = primaryMembership?.user?.created_at ?? primaryMembership?.created_at;
      if (!created) return false;
      return monthKeyFromDate(new Date(created)) === thisMonthKey;
    }).length,
  };

  return { users, stats };
}

export async function getAdminBusinessDetail(
  companyId: string
): Promise<AdminBusinessDetail | null> {
  if (!isSupabaseConfigured()) return null;
  if (!(await isCurrentUserPlatformAdmin())) return null;

  const supabase = await resolveAdminQueryClient();
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select(
      "id,slug,name,created_at,plan,subscription_status,primary_contact_name,primary_contact_email,contact_phone,contact_location,admin_client_note,setup_fee_waived,setup_fee_paid_at,industries(name)"
    )
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) {
    if (companyError) {
      console.error("[admin] getAdminBusinessDetail company", companyError.message);
    }
    return null;
  }

  type CompanyRow = {
    id: string;
    slug: string;
    name: string;
    created_at: string;
    plan: string | null;
    subscription_status: string | null;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    contact_phone: string | null;
    contact_location: string | null;
    admin_client_note: string | null;
    setup_fee_waived: boolean | null;
    setup_fee_paid_at: string | null;
    industries?: { name?: string | null } | null;
  };

  const row = company as CompanyRow;
  const [
    { data: hosting },
    { data: payments },
    { data: memberships },
  ] = await Promise.all([
    supabase
      .from("hosting_subscriptions")
      .select("status,plan_slug,next_billing_date")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("hosting_payments")
      .select("id,company_id,plan_slug,amount_cents,currency,status,created_at,paystack_reference")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("memberships")
      .select("id,user_id,role,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
  ]);

  const membershipRows = (memberships ?? []) as Array<{
    id: string;
    user_id: string;
    role: string | null;
    created_at: string;
  }>;

  const memberUserIds = [
    ...new Set(
      membershipRows.map((row) => row.user_id).filter((id): id is string => Boolean(id))
    ),
  ];

  const memberUserById = new Map<
    string,
    { email?: string | null; full_name?: string | null }
  >();

  if (memberUserIds.length) {
    const { data: memberUsers, error: memberUsersError } = await supabase
      .from("users")
      .select("id,email,full_name")
      .in("id", memberUserIds);

    if (memberUsersError) {
      console.error(
        "[admin] getAdminBusinessDetail users lookup",
        memberUsersError.message
      );
    } else {
      for (const user of memberUsers ?? []) {
        memberUserById.set(user.id as string, user as {
          email?: string | null;
          full_name?: string | null;
        });
      }
    }
  }

  const hostingRow = hosting as {
    status: string;
    plan_slug: string;
    next_billing_date: string | null;
  } | null;

  const subscriptionStatus = row.subscription_status ?? "inactive";
  const platformStatus = resolvePlatformStatusLabel(
    subscriptionStatus,
    hostingRow?.status ?? null
  );
  const workspacePlanSlug = normalizePlanSlug(row.plan);
  const planSlug = normalizePlanSlug(hostingRow?.plan_slug ?? row.plan);
  const email = row.primary_contact_email?.trim() || "unknown@client.local";
  const contactName =
    row.primary_contact_name?.trim() || email.split("@")[0] || "Unknown contact";

  const members: AdminBusinessMember[] = membershipRows.map((membership) => {
    const user = memberUserById.get(membership.user_id);
    const memberEmail = user?.email?.trim() || "unknown@user.local";
    return {
      id: membership.id,
      userId: membership.user_id,
      name: user?.full_name?.trim() || memberEmail.split("@")[0] || "User",
      email: memberEmail,
      role: membership.role?.trim() || "member",
      joined: formatJoinedDate(membership.created_at),
    };
  });

  const recentPayments = ((payments ?? []) as Array<{
    id: string;
    company_id: string;
    plan_slug: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
    paystack_reference: string | null;
  }>).map((payment) => paymentRowToTransaction(payment, row.name));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    industry: row.industries?.name?.trim() || "—",
    plan: planLabelForSlug(planSlug),
    workspacePlanSlug,
    platformStatus,
    subscriptionStatus,
    contactName,
    contactEmail: email,
    phone: row.contact_phone?.trim() || null,
    location: row.contact_location?.trim() || null,
    joined: formatJoinedDate(row.created_at),
    hostingStatus: hostingRow?.status ?? null,
    nextBillingDate: hostingRow?.next_billing_date
      ? formatCreatedDate(hostingRow.next_billing_date)
      : null,
    note: row.admin_client_note?.trim() || null,
    setupFeeWaived: row.setup_fee_waived === true,
    setupFeePaidAt: row.setup_fee_paid_at,
    recentPayments,
    members,
  };
}

function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadCompanyNameMap(
  supabase: Awaited<ReturnType<typeof resolveAdminQueryClient>>,
  companyIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (companyIds.length === 0) return map;
  const { data } = await supabase
    .from("companies")
    .select("id,name")
    .in("id", [...new Set(companyIds)]);
  for (const row of (data ?? []) as Array<{ id: string; name: string }>) {
    map.set(row.id, row.name?.trim() || "Unknown business");
  }
  return map;
}

export async function getAdminDomainsData(): Promise<AdminDomainsData> {
  const empty: AdminDomainsData = {
    total: 0,
    verified: 0,
    pending: 0,
    sslActive: 0,
    sslFailed: 0,
    domains: [],
  };
  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("website_domains")
    .select("id,domain,domain_type,verification_status,ssl_status,last_checked_at,company_id,companies(name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] getAdminDomainsData", error.message);
    return empty;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    domain: string;
    domain_type: string;
    verification_status: string;
    ssl_status: string;
    last_checked_at: string | null;
    company_id: string;
    companies?: { name?: string | null } | null;
  }>;

  const domains: AdminDomainRow[] = rows.map((row) => ({
    id: row.id,
    domain: row.domain,
    businessName: row.companies?.name?.trim() || "—",
    companyId: row.company_id,
    domainType: row.domain_type,
    verificationStatus: row.verification_status,
    sslStatus: row.ssl_status,
    lastChecked: row.last_checked_at ? shortDateTime(row.last_checked_at) : null,
  }));

  return {
    total: domains.length,
    verified: domains.filter((d) => d.verificationStatus === "verified").length,
    pending: domains.filter((d) => d.verificationStatus === "pending").length,
    sslActive: domains.filter((d) => d.sslStatus === "active").length,
    sslFailed: domains.filter((d) => d.sslStatus === "failed").length,
    domains,
  };
}

export async function getAdminCronData(): Promise<AdminCronData> {
  const empty: AdminCronData = { jobs: [], recentRuns: [], overallSuccessRate: 0 };
  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const [{ data: jobs, error: jobsError }, { data: runs, error: runsError }] =
    await Promise.all([
      supabase.from("platform_cron_jobs").select("id,name,schedule,description,enabled").order("name"),
      supabase
        .from("platform_cron_runs")
        .select("id,job_id,status,started_at,duration_ms,error_message,platform_cron_jobs(name)")
        .order("started_at", { ascending: false })
        .limit(30),
    ]);

  if (jobsError) console.error("[admin] getAdminCronData jobs", jobsError.message);
  if (runsError) console.error("[admin] getAdminCronData runs", runsError.message);

  const runRows = (runs ?? []) as unknown as Array<{
    id: string;
    job_id: string;
    status: string;
    started_at: string;
    duration_ms: number;
    error_message: string | null;
    platform_cron_jobs?: { name?: string | null } | Array<{ name?: string | null }> | null;
  }>;

  const runsByJob = new Map<string, typeof runRows>();
  for (const run of runRows) {
    const list = runsByJob.get(run.job_id) ?? [];
    list.push(run);
    runsByJob.set(run.job_id, list);
  }

  const jobRows: AdminCronJobRow[] = ((jobs ?? []) as Array<{
    id: string;
    name: string;
    schedule: string;
    description: string | null;
    enabled: boolean;
  }>).map((job) => {
    const jobRuns = runsByJob.get(job.id) ?? [];
    const last = jobRuns[0];
    const successes = jobRuns.filter((r) => r.status === "success").length;
    return {
      id: job.id,
      name: job.name,
      schedule: job.schedule,
      description: job.description,
      enabled: job.enabled,
      lastRun: last ? shortDateTime(last.started_at) : null,
      lastStatus: last?.status === "success" || last?.status === "failed" ? last.status : null,
      successRate:
        jobRuns.length > 0 ? Math.round((successes / jobRuns.length) * 100) : 100,
    };
  });

  const recentRuns: AdminCronRunRow[] = runRows.slice(0, 15).map((run) => {
    const jobMeta = Array.isArray(run.platform_cron_jobs)
      ? run.platform_cron_jobs[0]
      : run.platform_cron_jobs;
    return {
      id: run.id,
      jobId: run.job_id,
      jobName: jobMeta?.name?.trim() || run.job_id,
      status: run.status,
      startedAt: shortDateTime(run.started_at),
      durationMs: run.duration_ms,
      errorMessage: run.error_message,
    };
  });

  const overallSuccessRate =
    runRows.length > 0
      ? Math.round(
          (runRows.filter((run) => run.status === "success").length / runRows.length) * 100
        )
      : 100;

  return { jobs: jobRows, recentRuns, overallSuccessRate };
}

export async function getAdminApiUsageData(): Promise<AdminApiUsageData> {
  const empty: AdminApiUsageData = {
    totalRequests: 0,
    failedRequests: 0,
    rateLimitEvents: 0,
    requestsToday: 0,
    failureRatePercent: 0,
    topRoutes: [],
    recentLogs: [],
  };
  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("platform_api_logs")
    .select("id,route,method,status_code,company_id,duration_ms,is_public,created_at,error_message")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[admin] getAdminApiUsageData", error.message);
    return empty;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    route: string;
    method: string;
    status_code: number;
    company_id: string | null;
    duration_ms: number;
    is_public: boolean;
    created_at: string;
    error_message: string | null;
  }>;

  const companyIds = rows.map((r) => r.company_id).filter(Boolean) as string[];
  const companyNames = await loadCompanyNameMap(supabase, companyIds);

  const todayKey = new Date().toDateString();
  let failedRequests = 0;
  let rateLimitEvents = 0;
  let requestsToday = 0;
  const routeCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.status_code >= 400) failedRequests += 1;
    if (row.status_code === 429) rateLimitEvents += 1;
    if (new Date(row.created_at).toDateString() === todayKey) requestsToday += 1;
    routeCounts.set(row.route, (routeCounts.get(row.route) ?? 0) + 1);
  }

  const topRoutes = [...routeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([route, count]) => ({ route, count }));

  const recentLogs: AdminApiLogRow[] = rows.slice(0, 40).map((row) => ({
    id: row.id,
    route: row.route,
    method: row.method,
    statusCode: row.status_code,
    businessName: row.company_id ? companyNames.get(row.company_id) ?? null : null,
    durationMs: row.duration_ms,
    isPublic: row.is_public,
    createdAt: shortDateTime(row.created_at),
    errorMessage: row.error_message,
  }));

  return {
    totalRequests: rows.length,
    failedRequests,
    rateLimitEvents,
    requestsToday,
    failureRatePercent:
      rows.length > 0 ? Math.round((failedRequests / rows.length) * 100) : 0,
    topRoutes,
    recentLogs,
  };
}

export async function getAdminEmailsData(): Promise<AdminEmailsData> {
  const empty: AdminEmailsData = {
    totalSent: 0,
    deliveryRate: 0,
    failedCount: 0,
    sentToday: 0,
    recentLogs: [],
  };
  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("platform_email_logs")
    .select("id,to_address,subject,template,status,provider,company_id,created_at,error_message")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin] getAdminEmailsData", error.message);
    return empty;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    to_address: string;
    subject: string | null;
    template: string | null;
    status: string;
    provider: string;
    company_id: string | null;
    created_at: string;
    error_message: string | null;
  }>;

  const companyIds = rows.map((r) => r.company_id).filter(Boolean) as string[];
  const companyNames = await loadCompanyNameMap(supabase, companyIds);
  const todayKey = new Date().toDateString();

  const totalSent = rows.filter((r) => r.status === "sent").length;
  const failedCount = rows.filter((r) => r.status === "failed").length;
  const sentToday = rows.filter(
    (r) => r.status === "sent" && new Date(r.created_at).toDateString() === todayKey
  ).length;

  const recentLogs: AdminEmailLogRow[] = rows.slice(0, 40).map((row) => ({
    id: row.id,
    to: row.to_address,
    subject: row.subject,
    template: row.template,
    status: row.status,
    provider: row.provider,
    businessName: row.company_id ? companyNames.get(row.company_id) ?? null : null,
    createdAt: shortDateTime(row.created_at),
    errorMessage: row.error_message,
  }));

  return {
    totalSent,
    deliveryRate:
      rows.length > 0 ? Math.round((totalSent / rows.length) * 100) : 0,
    failedCount,
    sentToday,
    recentLogs,
  };
}

export async function getPlatformAuditLogs(limit = 50): Promise<AdminAuditLogRow[]> {
  if (!isSupabaseConfigured()) return [];
  if (!(await isCurrentUserPlatformAdmin())) return [];

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("platform_audit_logs")
    .select("id,actor_email,action,target_type,target_label,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin] getPlatformAuditLogs", error.message);
    return [];
  }

  return ((data ?? []) as Array<{
    id: string;
    actor_email: string | null;
    action: string;
    target_type: string;
    target_label: string | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    actorEmail: row.actor_email,
    action: row.action,
    targetType: row.target_type,
    targetLabel: row.target_label,
    createdAt: shortDateTime(row.created_at),
  }));
}

function emptyAdminSupportData(): AdminSupportData {
  return {
    tickets: [],
    stats: { open: 0, inProgress: 0, waiting: 0, resolvedThisMonth: 0 },
  };
}

function emptyAdminFeatureRequestsData(): AdminFeatureRequestsData {
  return {
    requests: [],
    stats: {
      submitted: 0,
      underReview: 0,
      planned: 0,
      inProgress: 0,
      shipped: 0,
    },
  };
}

export async function getAdminSupportData(): Promise<AdminSupportData> {
  const empty = emptyAdminSupportData();
  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("platform_support_tickets")
    .select(
      "id,ticket_number,company_id,subject,status,priority,category,requester_name,requester_email,assigned_to,created_at,updated_at,platform_support_messages(count)"
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin] getAdminSupportData", error.message);
    return empty;
  }

  type TicketRow = {
    id: string;
    ticket_number: number;
    company_id: string | null;
    subject: string;
    status: AdminSupportTicketStatus;
    priority: AdminSupportTicketPriority;
    category: AdminSupportTicketCategory;
    requester_name: string | null;
    requester_email: string | null;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
    platform_support_messages?: Array<{ count: number }> | { count: number } | null;
  };

  const rows = (data ?? []) as TicketRow[];
  const companyIds = rows.map((row) => row.company_id).filter(Boolean) as string[];
  const companyNames = await loadCompanyNameMap(supabase, companyIds);

  const now = new Date();
  const thisMonthKey = monthKeyFromDate(now);
  const stats: AdminSupportStats = {
    open: 0,
    inProgress: 0,
    waiting: 0,
    resolvedThisMonth: 0,
  };

  const tickets: AdminSupportTicketRow[] = rows.map((row) => {
    if (row.status === "open") stats.open += 1;
    if (row.status === "in_progress") stats.inProgress += 1;
    if (row.status === "waiting") stats.waiting += 1;
    if (
      (row.status === "resolved" || row.status === "closed") &&
      monthKeyFromDate(new Date(row.updated_at)) === thisMonthKey
    ) {
      stats.resolvedThisMonth += 1;
    }

    const messageMeta = Array.isArray(row.platform_support_messages)
      ? row.platform_support_messages[0]
      : row.platform_support_messages;

    return {
      id: row.id,
      ticketNumber: row.ticket_number,
      subject: row.subject,
      status: row.status,
      priority: row.priority,
      category: row.category,
      businessName: row.company_id ? companyNames.get(row.company_id) ?? null : null,
      companyId: row.company_id,
      requesterName: row.requester_name,
      requesterEmail: row.requester_email,
      assignedTo: row.assigned_to,
      messageCount: messageMeta?.count ?? 0,
      updatedAt: shortDateTime(row.updated_at),
      createdAt: shortDateTime(row.created_at),
    };
  });

  return { tickets, stats };
}

export async function getAdminSupportTicketDetail(
  ticketId: string
): Promise<AdminSupportTicketDetail | null> {
  if (!isSupabaseConfigured()) return null;
  if (!(await isCurrentUserPlatformAdmin())) return null;

  const supabase = await resolveAdminQueryClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("platform_support_tickets")
    .select("*")
    .eq("id", ticketId.trim())
    .maybeSingle();

  if (ticketError) {
    console.error("[admin] getAdminSupportTicketDetail ticket", ticketError.message);
    return null;
  }
  if (!ticket) return null;

  const { data: messages, error: messagesError } = await supabase
    .from("platform_support_messages")
    .select("id,author_name,author_email,body,is_internal,created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("[admin] getAdminSupportTicketDetail messages", messagesError.message);
  }

  type TicketDbRow = {
    id: string;
    ticket_number: number;
    company_id: string | null;
    subject: string;
    description: string;
    status: AdminSupportTicketStatus;
    priority: AdminSupportTicketPriority;
    category: AdminSupportTicketCategory;
    requester_name: string | null;
    requester_email: string | null;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
  };

  const row = ticket as TicketDbRow;
  const companyNames = row.company_id
    ? await loadCompanyNameMap(supabase, [row.company_id])
    : new Map<string, string>();

  const messageRows: AdminSupportMessageRow[] = (
    (messages ?? []) as Array<{
      id: string;
      author_name: string;
      author_email: string | null;
      body: string;
      is_internal: boolean;
      created_at: string;
    }>
  ).map((message) => ({
    id: message.id,
    authorName: message.author_name,
    authorEmail: message.author_email,
    body: message.body,
    isInternal: message.is_internal,
    createdAt: shortDateTime(message.created_at),
  }));

  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    category: row.category,
    businessName: row.company_id ? companyNames.get(row.company_id) ?? null : null,
    companyId: row.company_id,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    assignedTo: row.assigned_to,
    messageCount: messageRows.length,
    updatedAt: shortDateTime(row.updated_at),
    createdAt: shortDateTime(row.created_at),
    resolvedAt: row.resolved_at ? shortDateTime(row.resolved_at) : null,
    messages: messageRows,
  };
}

export async function getAdminFeatureRequestsData(): Promise<AdminFeatureRequestsData> {
  const empty = emptyAdminFeatureRequestsData();
  if (!isSupabaseConfigured()) return empty;
  if (!(await isCurrentUserPlatformAdmin())) return empty;

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("platform_feature_requests")
    .select(
      "id,company_id,title,description,status,priority,category,vote_count,submitted_by_name,submitted_by_email,admin_notes,created_at,updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin] getAdminFeatureRequestsData", error.message);
    return empty;
  }

  type RequestRow = {
    id: string;
    company_id: string | null;
    title: string;
    description: string;
    status: AdminFeatureRequestStatus;
    priority: AdminFeatureRequestPriority;
    category: string | null;
    vote_count: number;
    submitted_by_name: string | null;
    submitted_by_email: string | null;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
  };

  const rows = (data ?? []) as RequestRow[];
  const companyIds = rows.map((row) => row.company_id).filter(Boolean) as string[];
  const companyNames = await loadCompanyNameMap(supabase, companyIds);

  const stats: AdminFeatureRequestStats = {
    submitted: 0,
    underReview: 0,
    planned: 0,
    inProgress: 0,
    shipped: 0,
  };

  const requests: AdminFeatureRequestRow[] = rows.map((row) => {
    if (row.status === "submitted") stats.submitted += 1;
    if (row.status === "under_review") stats.underReview += 1;
    if (row.status === "planned") stats.planned += 1;
    if (row.status === "in_progress") stats.inProgress += 1;
    if (row.status === "shipped") stats.shipped += 1;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      category: row.category,
      voteCount: row.vote_count,
      businessName: row.company_id ? companyNames.get(row.company_id) ?? null : null,
      companyId: row.company_id,
      submittedByName: row.submitted_by_name,
      submittedByEmail: row.submitted_by_email,
      adminNotes: row.admin_notes,
      updatedAt: shortDateTime(row.updated_at),
      createdAt: shortDateTime(row.created_at),
    };
  });

  return { requests, stats };
}

export async function getAdminActivityItems(): Promise<AdminActivityItem[]> {
  if (!isSupabaseConfigured()) return [];
  if (!(await isCurrentUserPlatformAdmin())) return [];

  const supabase = await resolveAdminQueryClient();
  const [
    { data: companies, error: companiesError },
    { data: activities, error: activitiesError },
    { data: auditLogs, error: auditLogsError },
    { data: supportTickets, error: supportTicketsError },
    { data: featureRequests, error: featureRequestsError },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id,name,created_at,build_status,assigned_developer,primary_contact_name")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("project_activities")
      .select("id,project_id,title,stage,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("platform_audit_logs")
      .select("id,actor_email,action,target_type,target_id,target_label,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("platform_support_tickets")
      .select("id,ticket_number,subject,status,priority,created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("platform_feature_requests")
      .select("id,title,status,vote_count,created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (companiesError) {
    console.error("[admin] getAdminActivityItems companies", companiesError.message);
  }
  if (activitiesError) {
    console.error("[admin] getAdminActivityItems activities", activitiesError.message);
  }
  if (auditLogsError) {
    console.error("[admin] getAdminActivityItems audit", auditLogsError.message);
  }
  if (supportTicketsError) {
    console.error("[admin] getAdminActivityItems support", supportTicketsError.message);
  }
  if (featureRequestsError) {
    console.error("[admin] getAdminActivityItems features", featureRequestsError.message);
  }

  const companyRows = (companies ?? []) as Array<{
    id: string;
    name: string;
    created_at: string;
    build_status: string | null;
    assigned_developer: string | null;
    primary_contact_name: string | null;
  }>;
  const activityRows = (activities ?? []) as Array<{
    id: string;
    project_id: string;
    title: string;
    stage: string;
    created_at: string;
  }>;

  const activityProjectIds = Array.from(
    new Set(activityRows.map((row) => row.project_id).filter(Boolean))
  );

  let projectRows: Array<{
    id: string;
    company_id: string;
    name: string;
    status: string;
    created_at: string;
  }> = [];

  if (activityProjectIds.length > 0) {
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id,company_id,name,status,created_at")
      .in("id", activityProjectIds);

    if (projectsError) {
      console.error("[admin] getAdminActivityItems projects", projectsError.message);
    } else {
      projectRows = (projects ?? []) as typeof projectRows;
    }
  }

  const companyNameById = new Map(companyRows.map((c) => [c.id, c.name]));
  const missingCompanyIds = Array.from(
    new Set(
      projectRows
        .map((project) => project.company_id)
        .filter((companyId) => companyId && !companyNameById.has(companyId))
    )
  );

  if (missingCompanyIds.length > 0) {
    const { data: linkedCompanies, error: linkedCompaniesError } = await supabase
      .from("companies")
      .select("id,name")
      .in("id", missingCompanyIds);

    if (linkedCompaniesError) {
      console.error(
        "[admin] getAdminActivityItems linked companies",
        linkedCompaniesError.message
      );
    } else {
      for (const company of linkedCompanies ?? []) {
        companyNameById.set(company.id, company.name);
      }
    }
  }

  const projectById = new Map(projectRows.map((p) => [p.id, p]));
  const now = Date.now();

  const items: AdminActivityItem[] = [];

  function activityGroup(createdAt: string): AdminActivityGroup {
    const ageHours = Math.floor((now - new Date(createdAt).getTime()) / 3_600_000);
    return ageHours < 24 ? "today" : "week";
  }

  function auditHref(
    targetType: string,
    targetId: string | null
  ): string | null {
    if (!targetId) return null;
    if (targetType === "support_ticket") return `/admin/support/${targetId}`;
    if (targetType === "feature_request") return "/admin/feature-requests";
    if (targetType === "company") return `/admin/businesses/${targetId}`;
    if (targetType === "user") return "/admin/users";
    return "/admin/settings?tab=security";
  }

  function auditTitle(action: string): string {
    return action
      .split(".")
      .map((part) => part.replace(/_/g, " "))
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" · ");
  }

  for (const log of (auditLogs ?? []) as Array<{
    id: string;
    actor_email: string | null;
    action: string;
    target_type: string;
    target_id: string | null;
    target_label: string | null;
    created_at: string;
  }>) {
    const group = activityGroup(log.created_at);
    items.push({
      id: `audit-${log.id}`,
      title: auditTitle(log.action),
      description: [
        log.target_label ?? log.target_type,
        log.actor_email ? `by ${log.actor_email}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      time: shortRelativeTime(log.created_at),
      category: "platform",
      unread: group === "today",
      group,
      href: auditHref(log.target_type, log.target_id),
      iconKey: "shield",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    });
  }

  for (const ticket of (supportTickets ?? []) as Array<{
    id: string;
    ticket_number: number;
    subject: string;
    status: string;
    priority: string;
    created_at: string;
  }>) {
    const group = activityGroup(ticket.created_at);
    items.push({
      id: `support-${ticket.id}`,
      title: "Support ticket opened",
      description: `SUP-${String(ticket.ticket_number).padStart(4, "0")}: ${ticket.subject} (${ticket.priority})`,
      time: shortRelativeTime(ticket.created_at),
      category: "operations",
      unread: group === "today" && ticket.status === "open",
      group,
      href: `/admin/support/${ticket.id}`,
      iconKey: "lifeBuoy",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
    });
  }

  for (const request of (featureRequests ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    vote_count: number;
    created_at: string;
  }>) {
    const group = activityGroup(request.created_at);
    items.push({
      id: `feature-${request.id}`,
      title: "Feature request logged",
      description: `${request.title} · ${request.vote_count} votes · ${request.status.replace(/_/g, " ")}`,
      time: shortRelativeTime(request.created_at),
      category: "operations",
      unread: group === "today" && request.status === "submitted",
      group,
      href: "/admin/feature-requests",
      iconKey: "lightbulb",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    });
  }

  for (const a of activityRows.slice(0, 8)) {
    const project = projectById.get(a.project_id);
    const companyName = project ? companyNameById.get(project.company_id) ?? "Project" : "Project";
    const ageHours = Math.floor((now - new Date(a.created_at).getTime()) / 3_600_000);
    const isToday = ageHours < 24;
    const statusLabel = projectStageToAdmin(a.stage);
    const label =
      statusLabel === "completed"
        ? "Completed"
        : statusLabel === "in_review"
          ? "In Review"
          : statusLabel === "in_progress"
            ? "In Progress"
            : "Pending";

    items.push({
      id: `activity-${a.id}`,
      title: "Project activity updated",
      description: `${companyName}: ${a.title} (${label})`,
      time: shortRelativeTime(a.created_at),
      category: "projects",
      unread: isToday,
      group: isToday ? "today" : "week",
      iconKey: "bell",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-500",
    });
  }

  for (const c of companyRows.slice(0, 3)) {
    const ageHours = Math.floor((now - new Date(c.created_at).getTime()) / 3_600_000);
    const isToday = ageHours < 24;
    items.push({
      id: `client-${c.id}`,
      title: "Client/workspace created",
      description: `${c.primary_contact_name?.trim() || "New client"} joined via ${c.name}.`,
      time: shortRelativeTime(c.created_at),
      category: "clients",
      unread: isToday,
      group: isToday ? "today" : "week",
      iconKey: "userPlus",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
    });
  }

  for (const c of companyRows.filter((c) => c.assigned_developer).slice(0, 3)) {
    const at = c.created_at;
    const ageHours = Math.floor((now - new Date(at).getTime()) / 3_600_000);
    const isToday = ageHours < 24;
    items.push({
      id: `assign-${c.id}`,
      title: "Team member assigned",
      description: `${c.assigned_developer} assigned to ${c.name}.`,
      time: shortRelativeTime(at),
      category: "team",
      unread: isToday,
      group: isToday ? "today" : "week",
      iconKey: "userCheck",
      iconBg: "bg-teal-50",
      iconColor: "text-teal-500",
    });
  }

  return items
    .sort((a, b) => {
      const rank = (item: AdminActivityItem) => (item.group === "today" ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return 0;
    })
    .slice(0, 24);
}

export async function getAdminSettingsUsers(): Promise<
  {
    id: string;
    name: string;
    email: string;
    role: string;
    platformRoleId: string;
    platformRoleLabel: string;
    initials: string;
    color: string;
  }[]
> {
  if (!isSupabaseConfigured()) return [];
  if (!(await isCurrentUserPlatformAdmin())) return [];

  const supabase = await resolveAdminQueryClient();
  let adminRows: Array<{ user_id: string; role_id?: string | null }> = [];

  const { data: admins, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id, role_id");

  if (adminError) {
    if (isSupabaseSchemaMissingError(adminError)) {
      const { data: legacyAdmins, error: legacyError } = await supabase
        .from("platform_admins")
        .select("user_id");

      if (legacyError) {
        if (!isSupabaseSchemaMissingError(legacyError)) {
          console.error("[admin] getAdminSettingsUsers admins", legacyError.message);
        }
        return [];
      }

      adminRows = ((legacyAdmins ?? []) as Array<{ user_id: string }>).map((row) => ({
        user_id: row.user_id,
      }));
    } else {
      console.error("[admin] getAdminSettingsUsers admins", adminError.message);
      return [];
    }
  } else {
    adminRows = (admins ?? []) as Array<{ user_id: string; role_id?: string | null }>;
  }

  const adminIds = Array.from(new Set(adminRows.map((a) => a.user_id)));
  if (adminIds.length === 0) return [];

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id,email,full_name")
    .in("id", adminIds);

  if (usersError) {
    console.error("[admin] getAdminSettingsUsers users", usersError.message);
    return [];
  }

  const gradients = [
    "from-indigo-500 to-violet-600",
    "from-teal-500 to-emerald-600",
    "from-pink-500 to-rose-600",
    "from-amber-500 to-orange-600",
    "from-blue-500 to-indigo-600",
  ];

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return ((users ?? []) as AppUser[])
    .map((u, idx) => {
      const name = u.full_name?.trim() || u.email.split("@")[0] || "Admin";
      const adminRow = adminRows.find((row) => row.user_id === u.id);
      const platformRoleId = adminRow?.role_id ?? "platform_admin";
      const platformRole = getPlatformRoleDefinition(platformRoleId);
      return {
        id: u.id,
        name,
        email: u.email,
        role: platformRole.label,
        platformRoleId,
        platformRoleLabel: platformRole.label,
        initials: initials(name),
        color: gradients[idx % gradients.length]!,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const DEFAULT_PLATFORM_SETTINGS: AdminPlatformSettings = {
  companyName: "Farai Creative Studio",
  platformName: "FaraiOS",
};

const DEFAULT_NOTIFICATION_PREFERENCES: AdminNotificationPreferences = {
  emailAlerts: true,
  projectUpdates: true,
  clientActivity: false,
};

function parseNotificationPreferences(
  value: unknown
): AdminNotificationPreferences {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  const row = value as Record<string, unknown>;
  return {
    emailAlerts:
      typeof row.emailAlerts === "boolean"
        ? row.emailAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.emailAlerts,
    projectUpdates:
      typeof row.projectUpdates === "boolean"
        ? row.projectUpdates
        : DEFAULT_NOTIFICATION_PREFERENCES.projectUpdates,
    clientActivity:
      typeof row.clientActivity === "boolean"
        ? row.clientActivity
        : DEFAULT_NOTIFICATION_PREFERENCES.clientActivity,
  };
}

export async function getPlatformSettings(): Promise<AdminPlatformSettings> {
  if (!isSupabaseConfigured()) return { ...DEFAULT_PLATFORM_SETTINGS };
  if (!(await isCurrentUserPlatformAdmin())) return { ...DEFAULT_PLATFORM_SETTINGS };

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("company_name, platform_name")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[admin] getPlatformSettings", error.message);
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }

  return {
    companyName: data?.company_name?.trim() || DEFAULT_PLATFORM_SETTINGS.companyName,
    platformName: data?.platform_name?.trim() || DEFAULT_PLATFORM_SETTINGS.platformName,
  };
}

export async function getAdminNotificationPreferences(
  userId: string
): Promise<AdminNotificationPreferences> {
  if (!isSupabaseConfigured()) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  const supabase = await resolveAdminQueryClient();
  const { data, error } = await supabase
    .from("users")
    .select("admin_preferences")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[admin] getAdminNotificationPreferences", error.message);
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  return parseNotificationPreferences(data?.admin_preferences);
}
