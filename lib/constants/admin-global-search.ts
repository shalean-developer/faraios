import {
  ADMIN_INFRASTRUCTURE_NAV,
  ADMIN_INTERNAL_NAV,
  ADMIN_OPERATIONS_NAV,
  ADMIN_PLATFORM_NAV,
  ADMIN_SYSTEM_NAV,
} from "@/lib/constants/admin-nav";
import type { AdminGlobalSearchResult } from "@/types/admin-global-search";

const ADMIN_NAV_ITEMS = [
  ...ADMIN_PLATFORM_NAV,
  ...ADMIN_INFRASTRUCTURE_NAV,
  ...ADMIN_OPERATIONS_NAV,
  ...ADMIN_INTERNAL_NAV,
  ...ADMIN_SYSTEM_NAV,
];

export function getAdminNavigationSearchResults(
  query: string
): AdminGlobalSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return ADMIN_NAV_ITEMS.map((item) => ({
      id: `nav-${item.key}`,
      category: "navigation" as const,
      label: item.label,
      description: "Platform navigation",
      href: item.href,
    }));
  }

  return ADMIN_NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(normalized)
  ).map((item) => ({
    id: `nav-${item.key}`,
    category: "navigation" as const,
    label: item.label,
    description: "Platform navigation",
    href: item.href,
  }));
}

export const ADMIN_GLOBAL_SEARCH_CATEGORY_LABELS: Record<
  AdminGlobalSearchResult["category"],
  string
> = {
  navigation: "Navigation",
  business: "Businesses",
  user: "Users",
  ticket: "Support",
  domain: "Domains",
};
