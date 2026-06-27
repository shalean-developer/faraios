import type { CalendarLabel } from "@/lib/calendar/event-labels";

export const DEFAULT_CLIENT_LABELS: CalendarLabel[] = [
  { id: "unsatisfied", name: "Unsatisfied", color: "#7cb3ff" },
  { id: "potential", name: "Potential", color: "#5a8dee" },
  { id: "referral", name: "Referral", color: "#14b8a6" },
  { id: "corporate", name: "Corporate", color: "#a855f7" },
  { id: "inactive", name: "Inactive", color: "#94a3b8" },
];

const STORAGE_PREFIX = "faraios.clients.labels";

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}.${slug}`;
}

export function readClientLabels(slug: string): CalendarLabel[] {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return DEFAULT_CLIENT_LABELS;
    const parsed = JSON.parse(raw) as CalendarLabel[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CLIENT_LABELS;
    return parsed.filter(
      (label) =>
        typeof label.id === "string" &&
        typeof label.name === "string" &&
        typeof label.color === "string"
    );
  } catch {
    return DEFAULT_CLIENT_LABELS;
  }
}

export function writeClientLabels(slug: string, labels: CalendarLabel[]): void {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(labels));
  } catch {
    // ignore
  }
}

export function getClientLabelForCustomer(
  customerId: string,
  labels: CalendarLabel[]
): CalendarLabel | null {
  if (labels.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < customerId.length; i += 1) {
    hash = (hash << 5) - hash + customerId.charCodeAt(i);
    hash |= 0;
  }
  return labels[Math.abs(hash) % labels.length] ?? null;
}

export const CLIENT_GROUPS = [
  { name: "Gold", dot: "#eab308" },
  { name: "Silver", dot: "#94a3b8" },
  { name: "Platinum", dot: "#6366f1" },
  { name: "Standard", dot: "#22c55e" },
] as const;

export function getClientGroup(customerId: string): (typeof CLIENT_GROUPS)[number] {
  let hash = 0;
  for (let i = 0; i < customerId.length; i += 1) {
    hash = (hash << 5) - hash + customerId.charCodeAt(i);
    hash |= 0;
  }
  return CLIENT_GROUPS[Math.abs(hash) % CLIENT_GROUPS.length]!;
}
