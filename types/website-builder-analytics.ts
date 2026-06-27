export type WebVitalName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";

export type WebVitalRating = "good" | "needs-improvement" | "poor";

export type WebVitalSummary = {
  name: WebVitalName;
  p75: number;
  rating: WebVitalRating;
  sampleCount: number;
};

export type BuilderClickAnalytics = {
  label: string;
  href: string | null;
  element: "link" | "button";
  count: number;
};

export type BuilderPageAnalytics = {
  path: string;
  label: string;
  views: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  seoScore: number;
};

export type BuilderAnalytics = {
  periodDays: number;
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  pages: BuilderPageAnalytics[];
  topClicks: BuilderClickAnalytics[];
  webVitals: WebVitalSummary[];
  topReferrers: { source: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  hasData: boolean;
};
