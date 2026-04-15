import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";
import type { CompanyWithIndustry } from "@/types/database";
import type {
  AdminPipelineStatus,
  AdminProject,
  AdminProjectStats,
} from "@/types/admin";

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

function companyRowToAdminProject(row: CompanyWithIndustry): AdminProject {
  const email = row.primary_contact_email?.trim() || "—";
  const nameFromContact = row.primary_contact_name?.trim();
  const displayName =
    nameFromContact ||
    (email !== "—" ? email.split("@")[0] ?? "Client" : "Unknown client");

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
    pages: [],
    features: [],
    designStyle: "—",
    competitors: "—",
  };
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
