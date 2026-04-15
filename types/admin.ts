/** Admin UI + API — maps to DB `build_status` via lib/services/admin mapping helpers. */
export type AdminPipelineStatus =
  | "pending"
  | "in_progress"
  | "in_review"
  | "completed";

export type AdminProject = {
  id: string;
  slug: string;
  businessName: string;
  user: {
    name: string;
    email: string;
  };
  status: AdminPipelineStatus;
  assignedDeveloper: string | null;
  createdDate: string;
  /** ISO string for sorting / future pagination */
  createdAtIso: string;
  industry: string;
  /** Placeholders until persisted onboarding metadata exists */
  pages: string[];
  features: string[];
  designStyle: string;
  competitors: string;
};

export type AdminProjectStats = {
  total: number;
  pending: number;
  inProgress: number;
  inReview: number;
  completed: number;
};
