import type { CompanyNavKey } from "@/lib/constants/company-nav";
import {
  canAccessFeature,
  type AccessFeatureKey,
} from "@/lib/subscriptions/access";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import {
  canAccessWebsiteBuilderFeature,
  canAccessWebsiteSection,
} from "@/lib/website-builder/access";

function navKeyToFeature(key: CompanyNavKey): AccessFeatureKey {
  switch (key) {
    case "dashboard":
      return "overview";
    case "bookings":
      return "bookings";
    case "calendar":
      return "calendar";
    case "customers":
      return "customers";
    case "services":
      return "services";
    case "revenue":
      return "quotes";
    case "websites":
      return "websites";
    case "growth":
      return "leads";
    case "team":
      return "team";
    case "tasks":
      return "tasks";
    case "automations":
      return "automations";
    case "intelligence":
      return "reports";
    case "support":
      return "support";
    case "featureRequests":
      return "featureRequests";
    case "settings":
      return "settings";
    case "subscription":
      return "subscription";
    case "billing":
      return "billing";
    default:
      return "overview";
  }
}

export function filterNavBySubscription<
  T extends { key: CompanyNavKey },
>(items: T[], company: SubscriptionCompanyFields): T[] {
  return items.filter((item) => {
    if (item.key === "websites") {
      return canAccessWebsiteSection(company);
    }
    return canAccessFeature(company, navKeyToFeature(item.key));
  });
}

export function filterGrowthSubNavBySubscription<
  T extends { key: string },
>(items: T[], company: SubscriptionCompanyFields): T[] {
  const map: Record<string, AccessFeatureKey> = {
    overview: "leads",
    leads: "leads",
    seo: "seo",
    marketing: "campaigns",
    reviews: "reviews",
    campaigns: "campaigns",
    retention: "campaigns",
    analytics: "reports",
  };

  return items.filter((item) => {
    const feature = map[item.key] ?? "leads";
    return canAccessFeature(company, feature);
  });
}

export function filterRevenueSubNavBySubscription<
  T extends { key: string },
>(items: T[], company: SubscriptionCompanyFields): T[] {
  const map: Record<string, AccessFeatureKey> = {
    quotes: "quotes",
    invoices: "invoices",
    payments: "payments",
    overview: "payments",
    "payment-settings": "payments",
  };

  return items.filter((item) => {
    const feature = map[item.key] ?? "quotes";
    return canAccessFeature(company, feature);
  });
}

export function filterIntelligenceSubNavBySubscription<
  T extends { key: string },
>(items: T[], company: SubscriptionCompanyFields): T[] {
  const map: Record<string, AccessFeatureKey> = {
    overview: "reports",
    insights: "reports",
    "business-health": "businessHealth",
    "ai-insights": "aiInsights",
    reports: "reports",
  };

  return items.filter((item) => {
    const feature = map[item.key] ?? "reports";
    return canAccessFeature(company, feature);
  });
}

export function filterTeamSubNavBySubscription<
  T extends { key: string },
>(items: T[], company: SubscriptionCompanyFields): T[] {
  return items.filter((item) => {
    if (item.key === "roles") {
      return canAccessFeature(company, "customRoles");
    }
    return canAccessFeature(company, "team");
  });
}

const RISE_KEY_TO_NAV_KEY: Record<string, CompanyNavKey> = {
  dashboard: "dashboard",
  bookings: "bookings",
  calendar: "calendar",
  customers: "customers",
  services: "services",
  projects: "websites",
  tasks: "tasks",
  subscription: "subscription",
  revenue: "revenue",
  content: "growth",
  messages: "dashboard",
  websites: "websites",
  growth: "growth",
  automations: "automations",
  intelligence: "intelligence",
  team: "team",
  support: "support",
  knowledge: "featureRequests",
  files: "websites",
  reports: "intelligence",
  billing: "billing",
  settings: "settings",
};

export function filterRiseSidebarBySubscription<
  T extends { key: string },
>(items: T[], company: SubscriptionCompanyFields): T[] {
  return items.filter((item) => {
    const navKey = RISE_KEY_TO_NAV_KEY[item.key];
    if (!navKey) return true;

    if (item.key === "files") {
      return canAccessFeature(company, "hosting");
    }

    if (navKey === "websites") {
      return canAccessWebsiteSection(company);
    }

    return canAccessFeature(company, navKeyToFeature(navKey));
  });
}

export function filterWebsiteSubNavBySubscription<
  T extends { key: string },
>(items: T[], company: SubscriptionCompanyFields): T[] {
  return items.filter((item) => {
    if (item.key === "billing") {
      return canAccessFeature(company, "hosting");
    }
    if (item.key === "overview") {
      return canAccessWebsiteSection(company);
    }
    if (item.key.startsWith("builder")) {
      if (item.key === "builder-enquiries") {
        return canAccessWebsiteBuilderFeature(company, "websiteEnquiries");
      }
      if (item.key === "builder-service-pages") {
        return canAccessWebsiteBuilderFeature(company, "websiteServicePages");
      }
      if (item.key === "builder-seo") {
        return canAccessWebsiteBuilderFeature(company, "websiteSeo");
      }
      if (item.key === "builder-domains") {
        return (
          canAccessWebsiteBuilderFeature(company, "websiteBuilder") ||
          canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview")
        );
      }
      return (
        canAccessWebsiteBuilderFeature(company, "websiteBuilder") ||
        canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview")
      );
    }
    return canAccessFeature(company, "websites");
  });
}
