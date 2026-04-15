export type ProjectStatus =
  | "Pending"
  | "In Progress"
  | "In Review"
  | "Completed";

/** Shape compatible with future Supabase rows — add fields as needed */
export type Project = {
  id: string;
  /** Company slug for tenant routes, e.g. `/[slug]/dashboard`. */
  slug: string;
  name: string;
  category: string;
  status: ProjectStatus;
  date: string;
};
