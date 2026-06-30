import { normalizePlanSlug } from "@/lib/data/pricing";
import { getPlanEntitlements } from "@/lib/subscriptions/plan-entitlements";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

export type WebsiteBuilderFeature =
  | "websiteBuilderPreview"
  | "websiteBuilder"
  | "websitePublish"
  | "websiteServicePages"
  | "websiteSeo"
  | "websiteEnquiries"
  | "websiteDomains";

const BUILDER_ENTITLEMENTS = {
  starter: {
    websiteBuilderPreview: true,
    websiteBuilder: false,
    websitePublish: false,
    websiteServicePages: false,
    websiteSeo: false,
    websiteEnquiries: false,
    websiteDomains: false,
  },
  business: {
    websiteBuilderPreview: true,
    websiteBuilder: true,
    websitePublish: true,
    websiteServicePages: false,
    websiteSeo: false,
    websiteEnquiries: false,
    websiteDomains: false,
  },
  pro: {
    websiteBuilderPreview: true,
    websiteBuilder: true,
    websitePublish: true,
    websiteServicePages: true,
    websiteSeo: true,
    websiteEnquiries: true,
    websiteDomains: false,
  },
  enterprise: {
    websiteBuilderPreview: true,
    websiteBuilder: true,
    websitePublish: true,
    websiteServicePages: true,
    websiteSeo: true,
    websiteEnquiries: true,
    websiteDomains: true,
  },
} as const;

export function canAccessWebsiteBuilderFeature(
  company: SubscriptionCompanyFields,
  feature: WebsiteBuilderFeature
): boolean {
  const plan = normalizePlanSlug(company.plan) as keyof typeof BUILDER_ENTITLEMENTS;
  const entitlements = BUILDER_ENTITLEMENTS[plan] ?? BUILDER_ENTITLEMENTS.starter;
  return Boolean(entitlements[feature]);
}

export function minimumPlanForWebsiteBuilderFeature(
  feature: WebsiteBuilderFeature
): string {
  const order = ["starter", "business", "pro", "enterprise"] as const;
  for (const slug of order) {
    if (BUILDER_ENTITLEMENTS[slug][feature]) {
      return slug.charAt(0).toUpperCase() + slug.slice(1);
    }
  }
  return "Enterprise";
}

/** Legacy websites hub (Pro+) OR new builder access (Business+). */
export function canAccessWebsiteSection(company: SubscriptionCompanyFields): boolean {
  const plan = normalizePlanSlug(company.plan);
  const entitlements = getPlanEntitlements(plan);
  return (
    entitlements.websites ||
    canAccessWebsiteBuilderFeature(company, "websiteBuilder") ||
    canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview")
  );
}

export function publicSiteUrl(companySlug: string, appUrl?: string): string {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!base) return `/site/${encodeURIComponent(companySlug)}`;
  return `${base}/site/${encodeURIComponent(companySlug)}`;
}

const DEV_APP_HOST_PATTERN = /^(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function isDevAppUrl(url: string): boolean {
  try {
    return DEV_APP_HOST_PATTERN.test(new URL(url).host);
  } catch {
    return DEV_APP_HOST_PATTERN.test(url);
  }
}

/** Prefer a live app URL over a stale localhost value saved during local development. */
export function resolvePublicSiteUrl(
  companySlug: string,
  storedDefaultUrl?: string | null,
  appUrl?: string
): string {
  const computed = publicSiteUrl(companySlug, appUrl);
  const stored = storedDefaultUrl?.trim();
  if (!stored) return computed;
  if (isDevAppUrl(stored)) return computed;
  return stored;
}
