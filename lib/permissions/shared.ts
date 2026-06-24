/** Client-safe permission constants and helpers (no server imports). */

export const PERMISSION_KEYS = [
  "view_bookings",
  "edit_bookings",
  "view_revenue",
  "create_invoices",
  "manage_staff",
  "manage_marketing",
  "manage_settings",
  "view_customers",
  "edit_customers",
  "view_reports",
  "manage_automations",
  "view_tasks",
  "manage_tasks",
  "view_ai_insights",
  "view_websites",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<
  PermissionKey,
  { label: string; category: string }
> = {
  view_bookings: { label: "View bookings", category: "Operations" },
  edit_bookings: { label: "Edit bookings", category: "Operations" },
  view_customers: { label: "View customers", category: "Operations" },
  edit_customers: { label: "Edit customers", category: "Operations" },
  view_tasks: { label: "View tasks", category: "Team" },
  manage_tasks: { label: "Manage tasks", category: "Team" },
  manage_staff: { label: "Manage team", category: "Team" },
  view_revenue: { label: "View revenue", category: "Revenue" },
  create_invoices: { label: "Create invoices", category: "Revenue" },
  view_websites: { label: "View websites", category: "Website" },
  manage_marketing: { label: "Manage marketing", category: "Growth" },
  view_reports: { label: "View reports", category: "Intelligence" },
  view_ai_insights: { label: "Use Smart Search", category: "Intelligence" },
  manage_automations: { label: "Manage automations", category: "Team" },
  manage_settings: { label: "Manage settings", category: "Settings" },
};

export const ROLE_DEFAULTS: Record<string, PermissionKey[]> = {
  owner: [...PERMISSION_KEYS],
  admin: PERMISSION_KEYS.filter((k) => k !== "manage_settings"),
  manager: [
    "view_bookings",
    "edit_bookings",
    "view_customers",
    "edit_customers",
    "view_tasks",
    "manage_tasks",
    "view_reports",
    "view_ai_insights",
  ],
  staff: ["view_bookings", "edit_bookings", "view_customers", "view_tasks"],
  finance: [
    "view_revenue",
    "create_invoices",
    "view_reports",
    "view_customers",
  ],
  marketing: [
    "manage_marketing",
    "view_customers",
    "view_reports",
    "view_ai_insights",
  ],
};

export function hasAnyPermission(
  userPermissions: PermissionKey[],
  required?: PermissionKey[]
): boolean {
  if (!required?.length) return true;
  return required.some((permission) => userPermissions.includes(permission));
}
