import {
  companyAutomationsPath,
  companyMarketingPath,
  companyReviewsPath,
  companySeoPath,
  companyWebsiteBuilderPath,
  companyWebsiteBuilderSectionPath,
} from "@/lib/paths/company";
import type { WorkspaceGrantKey } from "@/types/platform-workspace";

export type AgencyWorkspaceNavKey =
  | "website_design"
  | "seo_tools"
  | "content"
  | "automation"
  | "search_console"
  | "reviews_listings";

export type AgencyWorkspaceNavItem = {
  key: AgencyWorkspaceNavKey;
  label: string;
  description: string;
  href: (slug: string) => string;
  requiredGrants: WorkspaceGrantKey[];
};

export type ResolvedAgencyWorkspaceNavItem = Omit<AgencyWorkspaceNavItem, "href"> & {
  href: string;
};

/** Agency deliverables shown in platform workspace mode (conditional on grants). */
export const AGENCY_WORKSPACE_NAV: AgencyWorkspaceNavItem[] = [
  {
    key: "website_design",
    label: "Website Design",
    description: "Visual builder, pages, and publishing",
    href: companyWebsiteBuilderPath,
    requiredGrants: ["website", "media"],
  },
  {
    key: "seo_tools",
    label: "SEO Tools",
    description: "SEO dashboard and health scores",
    href: companySeoPath,
    requiredGrants: ["seo", "website"],
  },
  {
    key: "content",
    label: "Content",
    description: "Blog posts and on-site content",
    href: (slug) => companyWebsiteBuilderSectionPath(slug, "blog"),
    requiredGrants: ["marketing", "media", "website"],
  },
  {
    key: "automation",
    label: "Automation",
    description: "Workflows and scheduled jobs",
    href: companyAutomationsPath,
    requiredGrants: ["automation"],
  },
  {
    key: "search_console",
    label: "Search Console",
    description: "Google Search Console and page SEO",
    href: (slug) => companyWebsiteBuilderSectionPath(slug, "seo"),
    requiredGrants: ["seo"],
  },
  {
    key: "reviews_listings",
    label: "Reviews & Listings",
    description: "Reviews and marketplace presence",
    href: companyReviewsPath,
    requiredGrants: ["marketing", "marketplace"],
  },
];

export const AGENCY_WORKSPACE_GRANT_KEYS: WorkspaceGrantKey[] = [
  "website",
  "seo",
  "marketing",
  "automation",
  "media",
  "domains",
  "marketplace",
];

/** Cross-tenant admin routes that have workspace-scoped agency alternatives. */
export const ADMIN_CROSS_TENANT_AGENCY_PATH_PREFIXES = [
  "/admin/websites",
  "/admin/seo",
] as const;
