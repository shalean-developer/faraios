/** Matches `projects.status` / `project_activities.stage` in Supabase */
export type ProjectPipelineStatus =
  | "pending"
  | "in_progress"
  | "review"
  | "completed";

/** UI stepper keys (no underscore in `inprogress`) */
export type ProjectStageKey =
  | "pending"
  | "inprogress"
  | "review"
  | "completed";

export type ProjectActivityRow = {
  id: string;
  title: string;
  completed: boolean;
  stage: ProjectPipelineStatus;
};

/**
 * Shape used by the project tracker UI (maps cleanly to a future API / Supabase row).
 */
export type ProjectTrackingDTO = {
  company_id: string;
  company_slug: string;
  /** Null until a `projects` row exists for this company */
  project_id: string | null;
  name: string;
  status: ProjectPipelineStatus;
  progress_percentage: number;
  current_stage: string | null;
  activities: ProjectActivityRow[];
};

export type ProjectProgressDTO = {
  company_id: string;
  progress_percentage: number;
  current_stage: string | null;
  status: ProjectPipelineStatus;
};
