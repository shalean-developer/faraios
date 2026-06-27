export type RobotsDirective = "index,follow" | "noindex" | "nofollow" | "noindex,nofollow";

export type TwitterCardType = "summary" | "summary_large_image";

export type RedirectType = "301" | "302" | "307" | "308";

export type SitemapFrequency = "daily" | "weekly" | "monthly";

export type PriceRange = "$" | "$$" | "$$$";

export type AnalyticsIntegration = {
  enabled: boolean;
  id: string;
  verified: boolean;
};

export type SeoRedirect = {
  id: string;
  from: string;
  to: string;
  type: RedirectType;
  createdAt: string;
};

export type WebsiteSeoSchemaFlags = {
  organization: boolean;
  localBusiness: boolean;
  cleaningService: boolean;
  website: boolean;
  breadcrumb: boolean;
  faq: boolean;
  review: boolean;
  service: boolean;
  article: boolean;
  person: boolean;
  video: boolean;
  event: boolean;
};

export type WebsiteSeoSettings = {
  basic: {
    focusKeywords: string[];
    urlSlug: string;
    canonicalUrl: string;
    robots: RobotsDirective;
    language: string;
    country: string;
    author: string;
  };
  social: {
    ogImageUrl: string | null;
    ogImageAlt: string;
    twitterCard: TwitterCardType;
    twitterTitle: string;
    twitterDescription: string;
    twitterImageUrl: string | null;
  };
  local: {
    businessName: string;
    businessDescription: string;
    phone: string;
    email: string;
    website: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    coordinates: string;
    openingHours: string;
    emergencyContact: string;
    logoUrl: string | null;
    priceRange: PriceRange;
    serviceAreas: string[];
  };
  schema: WebsiteSeoSchemaFlags;
  technical: {
    hreflang: string;
    faviconUrl: string | null;
    appleTouchIconUrl: string | null;
    themeColor: string;
    manifestUrl: string;
    robotsTxt: string;
    headScripts: string;
    bodyScripts: string;
    googleVerification: string;
    bingVerification: string;
    pinterestVerification: string;
    facebookVerification: string;
  };
  sitemap: {
    enabled: boolean;
    frequency: SitemapFrequency;
    lastGenerated: string | null;
  };
  redirects: SeoRedirect[];
  analytics: {
    ga4: AnalyticsIntegration;
    gtm: AnalyticsIntegration;
    clarity: AnalyticsIntegration;
    metaPixel: AnalyticsIntegration;
    linkedIn: AnalyticsIntegration;
    tiktok: AnalyticsIntegration;
  };
  preferences: {
    autoSave: boolean;
    autoCanonical: boolean;
    autoSlug: boolean;
    enableAi: boolean;
    enableSitemap: boolean;
    enableSchema: boolean;
    enableImageOptimization: boolean;
    enableLazyLoading: boolean;
    enableRedirectLogging: boolean;
  };
};

export type SeoAuditIssue = {
  id: string;
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  section?: string;
};

export type SeoScoreBreakdown = {
  overall: number;
  readability: number;
  indexedPages: number;
  missingMetadata: number;
  brokenLinks: number;
  missingAltText: number;
  schemaErrors: number;
  publishReadiness: number;
  issues: SeoAuditIssue[];
};

export type SeoEditorSection =
  | "overview"
  | "basic"
  | "social"
  | "local"
  | "schema"
  | "technical"
  | "analytics"
  | "sitemap"
  | "redirects"
  | "health";
