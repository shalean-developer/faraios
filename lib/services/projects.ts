import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { getCompanyBySlug } from "@/lib/services/companies";
import { DEFAULT_PROGRESS_BY_STATUS } from "@/lib/data/project-stages";
import type { Project } from "@/types/database";
import type {
  ProjectActivityRow,
  ProjectPipelineStatus,
  ProjectProgressDTO,
  ProjectTrackingDTO,
} from "@/types/project-tracking";

type ProjectRow = {
  id: string;
  company_id: string;
  name: string;
  status: ProjectPipelineStatus;
  progress: number;
  current_stage: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  title: string;
  completed: boolean;
  stage: ProjectPipelineStatus;
};

function normalizeProgress(
  status: ProjectPipelineStatus,
  raw: number | null | undefined
): number {
  const n = typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return DEFAULT_PROGRESS_BY_STATUS[status];
  }
  return Math.round(n);
}

/**
 * Projects for a company (RLS: members only). Used by company dashboard.
 */
export async function listProjectsForCompany(
  companyId: string
): Promise<Project[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, company_id, name, status, progress, current_stage, created_at"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projects] listProjectsForCompany", error.message);
    return [];
  }

  return (data ?? []) as Project[];
}

async function hasMembership(
  userId: string,
  companyId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[projects] hasMembership", error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * Full tracker payload for a company slug (requires signed-in user + membership).
 * If no `projects` row exists yet, returns a synthesized pending tracker for the company.
 */
export async function getProjectByCompany(
  slug: string
): Promise<ProjectTrackingDTO | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const company = await getCompanyBySlug(slug);
  if (!company) {
    return null;
  }

  const allowed = await hasMembership(user.id, company.id);
  if (!allowed) {
    return null;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, company_id, name, status, progress, current_stage, created_at")
    .eq("company_id", company.id)
    .maybeSingle();

  if (projectError) {
    console.error("[projects] getProjectByCompany project", projectError.message);
    return null;
  }

  if (!project) {
    const status: ProjectPipelineStatus = "pending";
    return {
      company_id: company.id,
      company_slug: company.slug,
      project_id: null,
      name: `${company.name} — Website`,
      status,
      progress_percentage: DEFAULT_PROGRESS_BY_STATUS[status],
      current_stage: status,
      activities: [],
    };
  }

  const p = project as ProjectRow;
  const status = p.status as ProjectPipelineStatus;

  const { data: actRows, error: actError } = await supabase
    .from("project_activities")
    .select("id, title, completed, stage")
    .eq("project_id", p.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (actError) {
    console.error("[projects] getProjectByCompany activities", actError.message);
  }

  const activities: ProjectActivityRow[] = (actRows ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    completed: Boolean(row.completed),
    stage: row.stage as ProjectPipelineStatus,
  }));

  return {
    company_id: company.id,
    company_slug: company.slug,
    project_id: p.id,
    name: p.name,
    status,
    progress_percentage: normalizeProgress(status, p.progress),
    current_stage: p.current_stage ?? status,
    activities,
  };
}

/** Compact progress snapshot (e.g. header widgets, realtime later). */
export async function getProjectProgress(
  slug: string
): Promise<ProjectProgressDTO | null> {
  const full = await getProjectByCompany(slug);
  if (!full) {
    return null;
  }
  return {
    company_id: full.company_id,
    progress_percentage: full.progress_percentage,
    current_stage: full.current_stage,
    status: full.status,
  };
}
