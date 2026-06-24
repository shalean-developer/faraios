export type OperationsMetrics = {
  totalBookings: number;
  pendingBookings: number;
  customers: number;
  revenueCents: number;
};

export type HomeOverviewMetrics = {
  bookingsToday: number;
  pendingBookings: number;
  totalBookings: number;
  customers: number;
  revenueTodayCents: number;
  revenueMonthCents: number;
  pendingQuotes: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  outstandingInvoicesCents: number;
  newLeads7d: number;
  businessHealthScore: number;
};

export type HomeActivityKind =
  | "booking"
  | "activity"
  | "payment"
  | "invoice"
  | "quote"
  | "lead";

export type HomeActivityItem = {
  id: string;
  kind: HomeActivityKind;
  title: string;
  subtitle: string;
  status: string | null;
  createdAt: string;
  entityId?: string;
};

export type HomeOverviewInsight = {
  title: string;
  body: string;
  priority?: "high" | "medium" | "low";
};

export type HomeOverviewData = {
  metrics: HomeOverviewMetrics;
  recentActivity: HomeActivityItem[];
  topInsight: HomeOverviewInsight | null;
};

export type GrowthOverviewMetrics = {
  seoScore: number;
  leads30d: number;
  conversionRate: number;
  websiteVisits30d: number;
  reviewRequestsSent30d: number;
  campaignsSent: number;
  publishedPosts: number;
  draftPosts: number;
};

export type GrowthOverviewData = {
  metrics: GrowthOverviewMetrics;
  topSeoAction: string | null;
};

export type IntelligenceOverviewMetrics = {
  businessHealthScore: number;
  revenueMonthCents: number;
  revenueGrowthPercent: number;
  bookingConversionRate: number;
  newCustomers30d: number;
  activeWorkflows: number;
};

export type IntelligenceOverviewData = {
  metrics: IntelligenceOverviewMetrics;
  topInsight: HomeOverviewInsight | null;
  healthRecommendations: string[];
};

export type RecentActivityItem = {
  id: string;
  type: "booking";
  title: string;
  subtitle: string;
  status: string | null;
  createdAt: string;
};

export function formatRevenue(cents: number, currency = "ZAR"): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPriceInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parsePriceToCents(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return 0;
  const num = Number.parseFloat(trimmed);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}
