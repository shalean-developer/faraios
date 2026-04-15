import type { ProjectPipelineStatus, ProjectStageKey } from "@/types/project-tracking";

/**
 * Static UX copy for the pipeline stepper (notifications / chat / files will layer on later).
 * Icons are referenced by id and resolved in the client component.
 */
export type StageIconId =
  | "clock"
  | "play"
  | "search"
  | "check"
  | "file"
  | "users"
  | "calendar"
  | "layers"
  | "sparkles";

export type StageDefinition = {
  key: ProjectStageKey;
  dbStatus: ProjectPipelineStatus;
  label: string;
  status: string;
  index: number;
  icon: StageIconId;
  color: string;
  ringColor: string;
  badgeBg: string;
  badgeText: string;
  glowColor: string;
  progressColor: string;
  description: string;
  detail: string;
  timeframe: string;
  /** Default checklist lines when `project_activities` has no rows for this stage */
  fallbackActivityTitles: string[];
  fallbackActivityIcons: StageIconId[];
};

export const PROJECT_STAGES: StageDefinition[] = [
  {
    key: "pending",
    dbStatus: "pending",
    label: "Pending",
    status: "Queued",
    index: 0,
    icon: "clock",
    color: "text-amber-500",
    ringColor: "ring-amber-400",
    badgeBg: "bg-amber-50 border-amber-200",
    badgeText: "text-amber-600",
    glowColor: "shadow-amber-300/60",
    progressColor: "#f59e0b",
    description:
      "Project has been submitted and is awaiting assignment to a development team.",
    detail:
      "Your project brief has been received and logged into our system. A project manager has been notified and will begin resource allocation shortly.",
    timeframe: "Est. start: 1–2 business days",
    fallbackActivityTitles: [
      "Project brief submitted",
      "Awaiting team assignment",
      "Timeline under review",
    ],
    fallbackActivityIcons: ["file", "users", "calendar"],
  },
  {
    key: "inprogress",
    dbStatus: "in_progress",
    label: "In Progress",
    status: "Active",
    index: 1,
    icon: "play",
    color: "text-indigo-500",
    ringColor: "ring-indigo-400",
    badgeBg: "bg-indigo-50 border-indigo-200",
    badgeText: "text-indigo-600",
    glowColor: "shadow-indigo-300/60",
    progressColor: "#6366f1",
    description:
      "Development is actively underway. Design mockups and frontend build are in progress.",
    detail:
      "Your dedicated development team has begun building. The design system is being implemented, responsive layouts are being crafted, and all pages specified in your plan are being developed to spec.",
    timeframe: "Est. duration: 8–12 business days",
    fallbackActivityTitles: [
      "UI/UX design in progress",
      "Frontend development started",
      "Content integration ongoing",
    ],
    fallbackActivityIcons: ["layers", "file", "sparkles"],
  },
  {
    key: "review",
    dbStatus: "review",
    label: "Review",
    status: "Under Review",
    index: 2,
    icon: "search",
    color: "text-violet-500",
    ringColor: "ring-violet-400",
    badgeBg: "bg-violet-50 border-violet-200",
    badgeText: "text-violet-600",
    glowColor: "shadow-violet-300/60",
    progressColor: "#8b5cf6",
    description:
      "Build is complete and under quality assurance. Awaiting your final feedback and sign-off.",
    detail:
      "All pages have been built and are in the QA pipeline. Our team is running cross-browser tests, mobile responsiveness checks, SEO audits, and performance reviews before presenting to you.",
    timeframe: "Est. review window: 2–3 business days",
    fallbackActivityTitles: [
      "QA testing underway",
      "Cross-browser checks done",
      "Awaiting client sign-off",
    ],
    fallbackActivityIcons: ["search", "layers", "users"],
  },
  {
    key: "completed",
    dbStatus: "completed",
    label: "Completed",
    status: "Live",
    index: 3,
    icon: "check",
    color: "text-emerald-500",
    ringColor: "ring-emerald-400",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-600",
    glowColor: "shadow-emerald-300/60",
    progressColor: "#10b981",
    description:
      "Your website is live, fully deployed, and ready to receive visitors worldwide.",
    detail:
      "Congratulations! Your website has been deployed to production, domain and DNS have been configured, SSL is active, and your Google Analytics integration is live. You are officially online.",
    timeframe: "Completed: All systems go",
    fallbackActivityTitles: [
      "Deployed to production",
      "SSL & DNS configured",
      "Analytics tracking active",
    ],
    fallbackActivityIcons: ["check", "sparkles", "calendar"],
  },
];

/** Default progress ring % if `projects.progress` is out of sync */
export const DEFAULT_PROGRESS_BY_STATUS: Record<ProjectPipelineStatus, number> =
  {
    pending: 8,
    in_progress: 40,
    review: 72,
    completed: 100,
  };

export function dbStatusToStageKey(
  status: ProjectPipelineStatus
): ProjectStageKey {
  if (status === "in_progress") return "inprogress";
  return status as ProjectStageKey;
}

export function stageKeyToDbStatus(key: ProjectStageKey): ProjectPipelineStatus {
  if (key === "inprogress") return "in_progress";
  return key as ProjectPipelineStatus;
}
