import {
  WORKSPACE_GRANT_KEYS,
  type WorkspaceGrantKey,
} from "@/types/platform-workspace";

export const PLATFORM_ROLE_IDS = [
  "platform_owner",
  "platform_admin",
  "support_agent",
  "developer",
  "marketing_specialist",
  "seo_specialist",
  "website_designer",
  "content_writer",
  "sales",
  "customer_success",
  "finance",
] as const;

export type PlatformRoleId = (typeof PLATFORM_ROLE_IDS)[number];

export const WORKSPACE_FULL_ACCESS_MODIFIER = "full_access" as const;

export type PlatformRoleDefinition = {
  id: PlatformRoleId;
  label: string;
  description: string;
  fullAccess: boolean;
  allowedGrants: WorkspaceGrantKey[];
  defaultGrants: WorkspaceGrantKey[];
};

/** Fallback definitions when DB tables are unavailable. */
export const PLATFORM_ROLE_DEFINITIONS: Record<PlatformRoleId, PlatformRoleDefinition> = {
  platform_owner: {
    id: "platform_owner",
    label: "Platform Owner",
    description: "Full platform and workspace access.",
    fullAccess: true,
    allowedGrants: [...WORKSPACE_GRANT_KEYS],
    defaultGrants: [...WORKSPACE_GRANT_KEYS],
  },
  platform_admin: {
    id: "platform_admin",
    label: "Platform Admin",
    description: "Full workspace access across all modules.",
    fullAccess: false,
    allowedGrants: [...WORKSPACE_GRANT_KEYS],
    defaultGrants: [...WORKSPACE_GRANT_KEYS],
  },
  support_agent: {
    id: "support_agent",
    label: "Support Agent",
    description: "Customer support and read-mostly workspace access.",
    fullAccess: false,
    allowedGrants: ["support", "customers", "bookings", "crm"],
    defaultGrants: ["support", "customers", "bookings", "crm"],
  },
  developer: {
    id: "developer",
    label: "Developer",
    description: "Website, hosting, and technical workspace access.",
    fullAccess: false,
    allowedGrants: ["website", "domains", "files", "media", "automation", "settings"],
    defaultGrants: ["website", "domains", "files", "media", "automation"],
  },
  marketing_specialist: {
    id: "marketing_specialist",
    label: "Marketing Specialist",
    description: "Marketing, campaigns, and analytics access.",
    fullAccess: false,
    allowedGrants: ["marketing", "analytics", "crm", "customers"],
    defaultGrants: ["marketing", "analytics", "crm"],
  },
  seo_specialist: {
    id: "seo_specialist",
    label: "SEO Specialist",
    description: "SEO, website, and analytics access.",
    fullAccess: false,
    allowedGrants: ["seo", "website", "analytics", "domains"],
    defaultGrants: ["seo", "website", "analytics"],
  },
  website_designer: {
    id: "website_designer",
    label: "Website Designer",
    description: "Website builder, media, and domain access.",
    fullAccess: false,
    allowedGrants: ["website", "media", "files", "domains"],
    defaultGrants: ["website", "media", "domains"],
  },
  content_writer: {
    id: "content_writer",
    label: "Content Writer",
    description: "Content, blog, and media workspace access.",
    fullAccess: false,
    allowedGrants: ["marketing", "media", "website"],
    defaultGrants: ["marketing", "media", "website"],
  },
  sales: {
    id: "sales",
    label: "Sales",
    description: "CRM, bookings, and revenue workspace access.",
    fullAccess: false,
    allowedGrants: ["crm", "customers", "bookings", "invoices", "payments"],
    defaultGrants: ["crm", "customers", "bookings", "invoices"],
  },
  customer_success: {
    id: "customer_success",
    label: "Customer Success",
    description: "Support, customers, and health reporting access.",
    fullAccess: false,
    allowedGrants: ["support", "customers", "bookings", "reports", "analytics"],
    defaultGrants: ["support", "customers", "bookings", "reports"],
  },
  finance: {
    id: "finance",
    label: "Finance",
    description: "Invoices, payments, and reporting access.",
    fullAccess: false,
    allowedGrants: ["invoices", "payments", "reports"],
    defaultGrants: ["invoices", "payments", "reports"],
  },
};

export const WORKSPACE_GRANT_PRESETS: {
  id: string;
  label: string;
  description: string;
  grants: WorkspaceGrantKey[];
}[] = [
  {
    id: "support",
    label: "Support",
    description: "Tickets, customers, and bookings",
    grants: ["support", "customers", "bookings", "crm"],
  },
  {
    id: "agency",
    label: "Agency",
    description: "Website, SEO, marketing, and domains",
    grants: ["website", "seo", "marketing", "media", "domains", "automation"],
  },
  {
    id: "revenue",
    label: "Revenue",
    description: "Quotes, invoices, and payments",
    grants: ["invoices", "payments", "reports", "customers"],
  },
];

export function isPlatformRoleId(value: string | null | undefined): value is PlatformRoleId {
  return Boolean(value && PLATFORM_ROLE_IDS.includes(value as PlatformRoleId));
}

export function getPlatformRoleDefinition(roleId: string | null | undefined): PlatformRoleDefinition {
  if (isPlatformRoleId(roleId)) {
    return PLATFORM_ROLE_DEFINITIONS[roleId];
  }
  return PLATFORM_ROLE_DEFINITIONS.platform_admin;
}
