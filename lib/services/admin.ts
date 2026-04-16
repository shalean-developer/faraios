import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";
import type { CompanyWithIndustry } from "@/types/database";
import type {
  AdminActivityItem,
  AdminAnalyticsActivity,
  AdminAnalyticsData,
  AdminAnalyticsDeveloperPoint,
  AdminClient,
  AdminClientProject,
  AdminClientStats,
  AdminAssignableProject,
  AdminProjectActivity,
  AdminProjectDetails,
  AdminMemberAvailability,
  AdminMemberStatus,
  AdminPipelineStatus,
  AdminProject,
  AdminProjectStats,
  AdminTeamMember,
} from "@/types/admin";
import type { AppUser } from "@/types/database";
import { normalizePlanSlug, pricingPlans } from "@/lib/data/pricing";

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
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[admin] isCurrentUserPlatformAdmin", error.message);
    return false;
  }
  return Boolean(data);
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

  const supabase = await createClient();
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

  const supabase = await createClient();
  const [{ data: users, error: usersError }, { data: memberships, error: membershipsError }, { data: companies, error: companiesError }] =
    await Promise.all([
      supabase.from("users").select("id,email,full_name"),
      supabase.from("memberships").select("user_id,role"),
      supabase
        .from("companies")
        .select("id,assigned_developer,primary_contact_name,primary_contact_email,name,build_status"),
    ]);

  if (usersError) {
    console.error("[admin] getAdminTeamMembers users", usersError.message);
    return [];
  }
  if (membershipsError) {
    console.error(
      "[admin] getAdminTeamMembers memberships",
      membershipsError.message
    );
    return [];
  }
  if (companiesError) {
    console.error("[admin] getAdminTeamMembers companies", companiesError.message);
    return [];
  }

  const membershipsByUser = new Map<string, MembershipRoleRow[]>();
  for (const membership of (memberships ?? []) as MembershipRoleRow[]) {
    const current = membershipsByUser.get(membership.user_id) ?? [];
    current.push(membership);
    membershipsByUser.set(membership.user_id, current);
  }

  const companiesByAssignee = new Map<string, number>();
  for (const company of (companies ?? []) as CompanyTeamRow[]) {
    const assignee = company.assigned_developer?.trim();
    if (!assignee) continue;
    const key = normalizeNameForCompare(assignee);
    companiesByAssignee.set(key, (companiesByAssignee.get(key) ?? 0) + 1);
  }

  return ((users ?? []) as AppUser[])
    .map((user) => {
      const name =
        user.full_name?.trim() || user.email.split("@")[0]?.trim() || "Unknown";
      const userMemberships = membershipsByUser.get(user.id) ?? [];
      const role = toDisplayRole(userMemberships[0]?.role);
      const projectCount = companiesByAssignee.get(normalizeNameForCompare(name)) ?? 0;
      const status = computeStatus(projectCount, userMemberships.length);
      const availability = computeAvailability(projectCount);

      return {
        id: user.id,
        name,
        email: user.email,
        role,
        status,
        availability,
        projectCount,
        avatarInitials: initialsFromName(name),
        avatarGradient: gradientForId(user.id),
      } satisfies AdminTeamMember;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAdminAssignableProjects(): Promise<AdminAssignableProject[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const allowed = await isCurrentUserPlatformAdmin();
  if (!allowed) {
    return [];
  }

  const supabase = await createClient();
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

  const supabase = await createClient();
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

  return {
    ...base,
    companyId: row.id,
    plan: row.plan?.trim() ?? null,
    deadline: row.next_billing_date ?? null,
    projectProgress: numericProgress,
    activities,
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

  const supabase = await createClient();
  const [{ data: companies, error: companiesError }, { data: projects, error: projectsError }, { data: activities, error: activitiesError }] =
    await Promise.all([
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

  if (companiesError || projectsError || activitiesError) {
    if (companiesError) console.error("[admin] getAdminAnalytics companies", companiesError.message);
    if (projectsError) console.error("[admin] getAdminAnalytics projects", projectsError.message);
    if (activitiesError) console.error("[admin] getAdminAnalytics activities", activitiesError.message);
    return empty;
  }

  const companyRows = (companies ?? []) as AnalyticsCompanyRow[];
  const projectRows = (projects ?? []) as AnalyticsProjectRow[];
  const activityRows = (activities ?? []) as AnalyticsActivityRow[];

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

  let runningTotal = 0;
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
  name: string;
  created_at: string;
  build_status: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
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

  const supabase = await createClient();
  const [{ data: companies, error: companiesError }, { data: projects, error: projectsError }] =
    await Promise.all([
      supabase
        .from("companies")
        .select(
          "id,name,created_at,build_status,primary_contact_name,primary_contact_email"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id,company_id,name,status,created_at")
        .order("created_at", { ascending: false }),
    ]);

  if (companiesError || projectsError) {
    if (companiesError) console.error("[admin] getAdminClients companies", companiesError.message);
    if (projectsError) console.error("[admin] getAdminClients projects", projectsError.message);
    return empty;
  }

  const companyRows = (companies ?? []) as AdminClientCompanyRow[];
  const projectRows = (projects ?? []) as AdminClientProjectRow[];
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

  const clients: AdminClient[] = companyRows.map((company) => {
    const email = company.primary_contact_email?.trim() || "unknown@client.local";
    const name = company.primary_contact_name?.trim() || email.split("@")[0] || "Unknown Client";
    const companyProjects = projectRows.filter((p) => p.company_id === company.id);
    const status = dbBuildStatusToAdmin(company.build_status) === "pending" ? "Inactive" : "Active";
    const joinedDate = formatJoinedDate(company.created_at);
    const note = `Primary contact for ${company.name}.`;
    const mostRecentProjectDate = companyProjects[0]?.created_at ?? company.created_at;

    return {
      id: company.id,
      name,
      email,
      business: company.name,
      phone: null,
      location: null,
      joined: joinedDate,
      projectCount: companyProjects.length,
      status,
      projects: companyProjects.map((p) => ({
        id: p.id,
        name: p.name,
        status: projectStatusToClientLabel(p.status),
      })),
      note,
      noteTime: shortRelativeTime(mostRecentProjectDate),
    };
  });

  const stats: AdminClientStats = {
    total: clients.length,
    active: clients.filter((c) => c.status === "Active").length,
    inactive: clients.filter((c) => c.status === "Inactive").length,
    newThisMonth: companyRows.filter((c) => {
      const d = new Date(c.created_at);
      return `${d.getFullYear()}-${d.getMonth()}` === thisMonthKey;
    }).length,
  };

  return { clients, stats };
}

export async function getAdminActivityItems(): Promise<AdminActivityItem[]> {
  if (!isSupabaseConfigured()) return [];
  if (!(await isCurrentUserPlatformAdmin())) return [];

  const supabase = await createClient();
  const [{ data: companies }, { data: projects }, { data: activities }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id,name,created_at,build_status,assigned_developer,primary_contact_name")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("projects")
        .select("id,company_id,name,status,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("project_activities")
        .select("id,project_id,title,stage,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const companyRows = (companies ?? []) as Array<{
    id: string;
    name: string;
    created_at: string;
    build_status: string | null;
    assigned_developer: string | null;
    primary_contact_name: string | null;
  }>;
  const projectRows = (projects ?? []) as Array<{
    id: string;
    company_id: string;
    name: string;
    status: string;
    created_at: string;
  }>;
  const activityRows = (activities ?? []) as Array<{
    id: string;
    project_id: string;
    title: string;
    stage: string;
    created_at: string;
  }>;

  const companyNameById = new Map(companyRows.map((c) => [c.id, c.name]));
  const projectById = new Map(projectRows.map((p) => [p.id, p]));
  const now = Date.now();

  const items: AdminActivityItem[] = [];

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
    const relatedProject = projectRows.find((p) => p.company_id === c.id);
    const at = relatedProject?.created_at ?? c.created_at;
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
      const rank = (i: AdminActivityItem) => (i.group === "today" ? 0 : 1);
      return rank(a) - rank(b);
    })
    .slice(0, 16);
}

export async function getAdminSettingsUsers(): Promise<
  {
    id: string;
    name: string;
    email: string;
    role: string;
    initials: string;
    color: string;
  }[]
> {
  if (!isSupabaseConfigured()) return [];
  if (!(await isCurrentUserPlatformAdmin())) return [];

  const supabase = await createClient();
  const { data: admins, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id");

  if (adminError) {
    console.error("[admin] getAdminSettingsUsers admins", adminError.message);
    return [];
  }

  const adminIds = Array.from(
    new Set((admins ?? []).map((a) => (a as { user_id: string }).user_id))
  );
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
      return {
        id: u.id,
        name,
        email: u.email,
        role: "Admin",
        initials: initials(name),
        color: gradients[idx % gradients.length]!,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
