/**
 * Interim assignee list for the admin pipeline. Replace with a `team_members`
 * (or similar) table when internal staffing is modeled in Supabase.
 */
export const ADMIN_DEVELOPER_OPTIONS = [
  { id: "sarah", name: "Sarah K." },
  { id: "james", name: "James T." },
  { id: "maria", name: "Maria L." },
  { id: "alex", name: "Alex P." },
] as const;

export type AdminDeveloperOption = (typeof ADMIN_DEVELOPER_OPTIONS)[number];
