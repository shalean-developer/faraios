import type { CompanyMemberRole } from "@/lib/services/team";

export const ASSIGNABLE_MEMBER_ROLES: CompanyMemberRole[] = [
  "admin",
  "manager",
  "staff",
  "finance",
  "marketing",
];

export const ROLE_DESCRIPTIONS: Record<CompanyMemberRole, string> = {
  owner: "Full access to all workspace features and settings.",
  admin: "Manage operations, revenue, growth, and team (except owner settings).",
  manager: "Operations, customers, tasks, and reports.",
  staff: "View and update assigned bookings and tasks.",
  finance: "Quotes, invoices, payments, and revenue reports.",
  marketing: "SEO, campaigns, content, and growth analytics.",
};
