import {
  canAccessFeature,
  type AccessFeatureKey,
} from "@/lib/subscriptions/access";
import { dashboardBaseFromPathname } from "@/lib/paths/workspace";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import {
  canAccessWebsiteBuilderFeature,
  canAccessWebsiteSection,
} from "@/lib/website-builder/access";

export function dashboardPathFeature(
  slug: string,
  pathname: string
): AccessFeatureKey | null {
  const base = dashboardBaseFromPathname(slug, pathname);
  const relative =
    pathname === base || pathname === `${base}/`
      ? ""
      : pathname.startsWith(`${base}/`)
        ? pathname.slice(`${base}/`.length)
        : null;

  if (relative === null) return null;

  if (!relative) return "overview";
  if (relative.startsWith("subscription")) return "subscription";
  if (relative.startsWith("billing")) return "billing";
  if (relative.startsWith("settings")) return "settings";
  if (relative.startsWith("support")) return "support";
  if (relative.startsWith("feature-requests")) return "featureRequests";
  if (relative.startsWith("notifications")) return "overview";

  if (
    relative.startsWith("bookings") ||
    relative.startsWith("booking-form")
  ) {
    return "bookings";
  }
  if (relative.startsWith("calendar")) return "calendar";
  if (relative.startsWith("customers")) return "customers";
  if (relative.startsWith("services")) return "services";
  if (relative.startsWith("team")) return "team";
  if (relative.startsWith("tasks")) return "tasks";
  if (relative.startsWith("automations")) return "automations";

  if (relative.startsWith("quotes")) return "quotes";
  if (relative.startsWith("invoices")) return "invoices";
  if (relative.startsWith("payments")) return "payments";
  if (relative.startsWith("revenue")) return "payments";

  if (relative.startsWith("leads")) return "leads";
  if (relative.startsWith("seo")) return "seo";
  if (relative.startsWith("reviews")) return "reviews";
  if (
    relative.startsWith("campaigns") ||
    relative.startsWith("marketing") ||
    relative.startsWith("content") ||
    relative.startsWith("analytics") ||
    relative.startsWith("growth")
  ) {
    return "campaigns";
  }

  if (relative.startsWith("ai-insights")) return "aiInsights";
  if (relative.startsWith("business-health")) return "businessHealth";
  if (
    relative.startsWith("reports") ||
    relative.startsWith("insights") ||
    relative.startsWith("intelligence")
  ) {
    return "reports";
  }

  if (relative.startsWith("hosting")) return "hosting";

  if (relative.startsWith("websites/builder")) {
    return "websiteBuilder";
  }

  if (
    relative.startsWith("websites") ||
    relative.startsWith("project")
  ) {
    return "websites";
  }

  return "overview";
}

export function canAccessDashboardPath(
  company: SubscriptionCompanyFields,
  slug: string,
  pathname: string
): boolean {
  const feature = dashboardPathFeature(slug, pathname);
  if (!feature) return true;

  if (feature === "websiteBuilder") {
    return (
      canAccessWebsiteBuilderFeature(company, "websiteBuilder") ||
      canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview")
    );
  }

  if (feature === "websites") {
    return canAccessWebsiteSection(company);
  }

  return canAccessFeature(company, feature);
}
