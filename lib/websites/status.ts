export type WebsiteConnectionStatus =
  | "draft"
  | "connected"
  | "verification_pending"
  | "verified"
  | "live"
  | "error"
  | "archived";

export type WebsiteMode = "external" | "hosted" | "builder";

export const WEBSITE_CONNECTION_STATUSES: WebsiteConnectionStatus[] = [
  "draft",
  "connected",
  "verification_pending",
  "verified",
  "live",
  "error",
  "archived",
];

export function connectionStatusLabel(status: WebsiteConnectionStatus): string {
  const labels: Record<WebsiteConnectionStatus, string> = {
    draft: "Draft",
    connected: "Connected",
    verification_pending: "Verification pending",
    verified: "Verified",
    live: "Live",
    error: "Error",
    archived: "Archived",
  };
  return labels[status] ?? status;
}

export function connectionStatusColor(status: WebsiteConnectionStatus): string {
  const map: Record<WebsiteConnectionStatus, string> = {
    draft: "bg-slate-100 text-slate-700",
    connected: "bg-blue-50 text-blue-800",
    verification_pending: "bg-amber-50 text-amber-800",
    verified: "bg-emerald-50 text-emerald-800",
    live: "bg-emerald-100 text-emerald-900",
    error: "bg-red-50 text-red-800",
    archived: "bg-slate-50 text-slate-500",
  };
  return map[status] ?? map.draft;
}
