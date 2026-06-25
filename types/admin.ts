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
  projectGoal: string | null;
  contactPhone: string | null;
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
  websiteId: string | null;
  listedInMarketplace: boolean;
  marketplaceSummary: string | null;
  marketplaceLocation: string | null;
  marketplaceFeatured: boolean;
  websitePublished: boolean;
  activities: AdminProjectActivity[];
  notes: AdminCompanyNote[];
};

export type AdminCompanyNote = {
  id: string;
  authorName: string;
  body: string;
  createdAtIso: string;
};

export type AdminPlatformSettings = {
  companyName: string;
  platformName: string;
};

export type AdminSearchConsoleIntegrationSettings = {
  clientId: string;
  hasClientSecret: boolean;
  redirectUri: string | null;
  configured: boolean;
  source: "env" | "database" | "none";
};

export type AdminNotificationPreferences = {
  emailAlerts: boolean;
  projectUpdates: boolean;
  clientActivity: boolean;
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
  slug: string;
  name: string;
  email: string;
  business: string;
  industry: string;
  plan: string;
  platformStatus: AdminPlatformStatus;
  subscriptionStatus: string;
  phone: string | null;
  location: string | null;
  joined: string;
  projectCount: number;
  /** @deprecated Use platformStatus for SaaS lifecycle */
  status: "Active" | "Inactive";
  projects: AdminClientProject[];
  note: string | null;
  noteTime: string | null;
};

export type AdminPlatformStatus = "Active" | "Trial" | "Suspended" | "Inactive";

export type AdminClientStats = {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
};

export type AdminActivityCategory =
  | "all"
  | "projects"
  | "team"
  | "clients"
  | "platform"
  | "operations";

export type AdminActivityGroup = "today" | "week";

export type AdminActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  category: AdminActivityCategory;
  unread: boolean;
  group: AdminActivityGroup;
  href?: string | null;
  iconKey:
    | "bell"
    | "folderPlus"
    | "userCheck"
    | "userPlus"
    | "checkCircle2"
    | "stickyNote"
    | "upload"
    | "shield"
    | "lifeBuoy"
    | "lightbulb";
  iconBg: string;
  iconColor: string;
};

export type AdminHealthStatus = "healthy" | "warning" | "critical" | "unknown";

export type AdminSystemHealth = {
  api: AdminHealthStatus;
  cron: AdminHealthStatus;
  email: AdminHealthStatus;
  websites: AdminHealthStatus;
  domains: AdminHealthStatus;
};

export type AdminPlatformBusinessMetrics = {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  newThisMonth: number;
};

export type AdminPlatformUserMetrics = {
  total: number;
  active: number;
  newThisMonth: number;
  growthRatePercent: number;
};

export type AdminPlatformRevenueMetrics = {
  mrr: number;
  arr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  failedPayments: number;
};

export type AdminPlatformActivityMetrics = {
  totalBookings: number;
  totalLeads: number;
  totalInvoices: number;
  totalPayments: number;
  totalEmailsSent: number;
};

export type AdminOverviewBusinessRow = {
  id: string;
  name: string;
  industry: string;
  plan: string;
  status: string;
  createdDate: string;
};

export type AdminOverviewTicketRow = {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  updatedAt: string;
};

export type AdminOverviewFeatureRequestRow = {
  id: string;
  title: string;
  voteCount: number;
  status: string;
};

export type AdminPlatformOperationsMetrics = {
  openTickets: number;
  urgentTickets: number;
  pendingFeatureRequests: number;
};

export type AdminPlatformOverviewMetrics = {
  businesses: AdminPlatformBusinessMetrics;
  users: AdminPlatformUserMetrics;
  revenue: AdminPlatformRevenueMetrics;
  activity: AdminPlatformActivityMetrics;
  operations: AdminPlatformOperationsMetrics;
  systemHealth: AdminSystemHealth;
  recentBusinesses: AdminOverviewBusinessRow[];
  recentOpenTickets: AdminOverviewTicketRow[];
  topFeatureRequests: AdminOverviewFeatureRequestRow[];
  pipelineStats: AdminProjectStats;
};

export type AdminRevenueTransaction = {
  id: string;
  companyId: string;
  businessName: string;
  plan: string;
  amount: number;
  currency: string;
  status: "success" | "failed" | "pending";
  date: string;
  dateIso: string;
  reference: string | null;
};

export type AdminPlatformRevenueData = {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  churnRatePercent: number;
  arpa: number;
  successfulPayments: number;
  failedPayments: number;
  refunds: number;
  monthlyTrend: AdminAnalyticsPoint[];
  weeklyTrend: AdminAnalyticsPoint[];
  transactions: AdminRevenueTransaction[];
};

export type AdminPlatformUserRow = {
  id: string;
  name: string;
  email: string;
  businessId: string | null;
  businessName: string;
  role: string;
  status: "Active" | "Inactive";
  joined: string;
  membershipCount: number;
};

export type AdminPlatformUserStats = {
  total: number;
  active: number;
  owners: number;
  newThisMonth: number;
};

export type AdminBusinessMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joined: string;
};

export type AdminBusinessDetail = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  plan: string;
  platformStatus: AdminPlatformStatus;
  subscriptionStatus: string;
  contactName: string;
  contactEmail: string;
  phone: string | null;
  location: string | null;
  joined: string;
  hostingStatus: string | null;
  nextBillingDate: string | null;
  note: string | null;
  recentPayments: AdminRevenueTransaction[];
  members: AdminBusinessMember[];
};

export type AdminDomainRow = {
  id: string;
  domain: string;
  businessName: string;
  companyId: string;
  domainType: string;
  verificationStatus: string;
  sslStatus: string;
  lastChecked: string | null;
};

export type AdminDomainsData = {
  total: number;
  verified: number;
  pending: number;
  sslActive: number;
  sslFailed: number;
  domains: AdminDomainRow[];
};

export type AdminCronJobRow = {
  id: string;
  name: string;
  schedule: string;
  description: string | null;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: "success" | "failed" | null;
  successRate: number;
};

export type AdminCronRunRow = {
  id: string;
  jobId: string;
  jobName: string;
  status: string;
  startedAt: string;
  durationMs: number;
  errorMessage: string | null;
};

export type AdminCronData = {
  jobs: AdminCronJobRow[];
  recentRuns: AdminCronRunRow[];
  overallSuccessRate: number;
};

export type AdminApiLogRow = {
  id: string;
  route: string;
  method: string;
  statusCode: number;
  businessName: string | null;
  durationMs: number;
  isPublic: boolean;
  createdAt: string;
  errorMessage: string | null;
};

export type AdminApiUsageData = {
  totalRequests: number;
  failedRequests: number;
  rateLimitEvents: number;
  requestsToday: number;
  failureRatePercent: number;
  topRoutes: { route: string; count: number }[];
  recentLogs: AdminApiLogRow[];
};

export type AdminEmailLogRow = {
  id: string;
  to: string;
  subject: string | null;
  template: string | null;
  status: string;
  provider: string;
  businessName: string | null;
  createdAt: string;
  errorMessage: string | null;
};

export type AdminEmailsData = {
  totalSent: number;
  deliveryRate: number;
  failedCount: number;
  sentToday: number;
  recentLogs: AdminEmailLogRow[];
};

export type AdminAuditLogRow = {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetLabel: string | null;
  createdAt: string;
};

export type AdminSupportTicketStatus =
  | "open"
  | "in_progress"
  | "waiting"
  | "resolved"
  | "closed";

export type AdminSupportTicketPriority = "low" | "medium" | "high" | "urgent";

export type AdminSupportTicketCategory =
  | "general"
  | "billing"
  | "technical"
  | "account";

export type AdminSupportTicketRow = {
  id: string;
  ticketNumber: number;
  subject: string;
  status: AdminSupportTicketStatus;
  priority: AdminSupportTicketPriority;
  category: AdminSupportTicketCategory;
  businessName: string | null;
  companyId: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  assignedTo: string | null;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
};

export type AdminSupportStats = {
  open: number;
  inProgress: number;
  waiting: number;
  resolvedThisMonth: number;
};

export type AdminSupportData = {
  tickets: AdminSupportTicketRow[];
  stats: AdminSupportStats;
};

export type AdminSupportMessageRow = {
  id: string;
  authorName: string;
  authorEmail: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
};

export type AdminSupportTicketDetail = AdminSupportTicketRow & {
  description: string;
  resolvedAt: string | null;
  messages: AdminSupportMessageRow[];
};

export type AdminFeatureRequestStatus =
  | "submitted"
  | "under_review"
  | "planned"
  | "in_progress"
  | "shipped"
  | "declined";

export type AdminFeatureRequestPriority = "low" | "medium" | "high";

export type AdminFeatureRequestRow = {
  id: string;
  title: string;
  description: string;
  status: AdminFeatureRequestStatus;
  priority: AdminFeatureRequestPriority;
  category: string | null;
  voteCount: number;
  businessName: string | null;
  companyId: string | null;
  submittedByName: string | null;
  submittedByEmail: string | null;
  adminNotes: string | null;
  updatedAt: string;
  createdAt: string;
};

export type AdminFeatureRequestStats = {
  submitted: number;
  underReview: number;
  planned: number;
  inProgress: number;
  shipped: number;
};

export type AdminFeatureRequestsData = {
  requests: AdminFeatureRequestRow[];
  stats: AdminFeatureRequestStats;
};
