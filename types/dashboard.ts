/** Build pipeline status stored on `companies.build_status`. */
export type CompanyBuildStatus =
  | "pending"
  | "in-progress"
  | "review"
  | "completed";

/** Subscription — replace mock in `getDashboardSnapshot` when billing table exists. */
export type DashboardSubscription = {
  planName: string;
  status: "active" | "past_due" | "canceled";
  renewsLabel: string | null;
};

/** One row for the main dashboard project table. */
export type DashboardProjectRow = {
  id: string;
  slug: string;
  businessName: string;
  status: CompanyBuildStatus;
  createdDate: string;
  industry: string;
  isPublished: boolean;
};

/** Placeholders for upcoming product areas (bookings wired; rest stubbed). */
export type DashboardFutureIntegrations = {
  bookings: { totalCount: number };
  payments: { state: "planned" };
  analytics: { state: "planned" };
};

export type DashboardSnapshotAuthenticated = {
  authenticated: true;
  user: {
    id: string;
    email: string | null;
    displayName: string;
  };
  subscription: DashboardSubscription;
  metrics: {
    totalProjects: number;
    activeSites: number;
    /** Shown instead of a fake “unlimited” bandwidth number until usage metering exists. */
    bandwidthLabel: string;
  };
  /** First published workspace dashboard URL, for the header CTA. */
  launchHref: string | null;
  projects: DashboardProjectRow[];
  future: DashboardFutureIntegrations;
};

export type DashboardSnapshotUnauthenticated = {
  authenticated: false;
};

export type DashboardSnapshot =
  | DashboardSnapshotAuthenticated
  | DashboardSnapshotUnauthenticated;
