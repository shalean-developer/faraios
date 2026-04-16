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
  pages: string[];
  features: string[];
  designStyle: string | null;
  competitors: string | null;
};

export type AdminProjectStats = {
  total: number;
  pending: number;
  inProgress: number;
  inReview: number;
  completed: number;
};

export type AdminMemberStatus = "Active" | "Offline";
export type AdminMemberAvailability = "Available" | "Busy";

export type AdminTeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: AdminMemberStatus;
  availability: AdminMemberAvailability;
  projectCount: number;
  avatarInitials: string;
  avatarGradient: string;
};

export type AdminAssignableProject = {
  id: string;
  name: string;
  client: string;
  status: AdminPipelineStatus;
};

export type AdminProjectActivity = {
  id: string;
  title: string;
  stage: AdminPipelineStatus;
  completed: boolean;
  createdAtIso: string;
};

export type AdminProjectDetails = AdminProject & {
  companyId: string;
  plan: string | null;
  deadline: string | null;
  projectProgress: number;
  activities: AdminProjectActivity[];
};

export type AdminAnalyticsPoint = {
  label: string;
  value: number;
};

export type AdminAnalyticsStatusPoint = {
  name: string;
  value: number;
  color: string;
};

export type AdminAnalyticsDeveloperPoint = {
  name: string;
  projects: number;
  completed: number;
  progress: number;
  badge: string;
};

export type AdminAnalyticsActivity = {
  id: string;
  time: string;
  project: string;
  action: string;
  status: string;
  color: string;
  dot: string;
};

export type AdminAnalyticsData = {
  monthLabel: string;
  totalProjects: number;
  completedProjects: number;
  activeClients: number;
  revenueTotal: number;
  projectsOverTime: AdminAnalyticsPoint[];
  developerWorkload: { name: string; projects: number }[];
  statusBreakdown: AdminAnalyticsStatusPoint[];
  monthlyRevenue: AdminAnalyticsPoint[];
  topDevelopers: AdminAnalyticsDeveloperPoint[];
  activityLog: AdminAnalyticsActivity[];
};

export type AdminClientProject = {
  id: string;
  name: string;
  status: "Pending" | "In Progress" | "In Review" | "Completed";
};

export type AdminClient = {
  id: string;
  name: string;
  email: string;
  business: string;
  phone: string | null;
  location: string | null;
  joined: string;
  projectCount: number;
  status: "Active" | "Inactive";
  projects: AdminClientProject[];
  note: string | null;
  noteTime: string | null;
};

export type AdminClientStats = {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
};

export type AdminActivityCategory = "all" | "projects" | "team" | "clients";
export type AdminActivityGroup = "today" | "week";

export type AdminActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  category: AdminActivityCategory;
  unread: boolean;
  group: AdminActivityGroup;
  iconKey: "bell" | "folderPlus" | "userCheck" | "userPlus" | "checkCircle2" | "stickyNote" | "upload";
  iconBg: string;
  iconColor: string;
};
