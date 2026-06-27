import type { Booking } from "@/types/database";

export type CalendarLabel = {
  id: string;
  name: string;
  color: string;
};

export type EventTypeFilter =
  | "events"
  | "leave"
  | "task_start"
  | "task_deadline"
  | "project_start"
  | "project_deadline";

export type LabelFilter = "all" | string;

export const LABEL_COLOR_SWATCHES = [
  "#86efac",
  "#14b8a6",
  "#60a5fa",
  "#94a3b8",
  "#fde047",
  "#fb923c",
  "#ef4444",
  "#f472b6",
  "#a855f7",
  "#22d3ee",
  "#1e3a5f",
  "#c4b5fd",
] as const;

export const DEFAULT_CALENDAR_LABELS: CalendarLabel[] = [
  { id: "call", name: "Call", color: "#ef4444" },
  { id: "email", name: "Email", color: "#5a8dee" },
  { id: "visit", name: "Visit", color: "#22c55e" },
];

export const EVENT_TYPE_OPTIONS: { value: EventTypeFilter; label: string }[] = [
  { value: "events", label: "Events" },
  { value: "leave", label: "Leave" },
  { value: "task_start", label: "Task start date" },
  { value: "task_deadline", label: "Task deadline" },
  { value: "project_start", label: "Project start date" },
  { value: "project_deadline", label: "Project deadline" },
];

function labelsStorageKey(slug: string): string {
  return `faraios.calendar.labels.${slug}`;
}

export function readCalendarLabels(slug: string): CalendarLabel[] {
  try {
    const raw = window.localStorage.getItem(labelsStorageKey(slug));
    if (!raw) return DEFAULT_CALENDAR_LABELS;
    const parsed = JSON.parse(raw) as CalendarLabel[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CALENDAR_LABELS;
    return parsed.filter(
      (label) =>
        typeof label.id === "string" &&
        typeof label.name === "string" &&
        typeof label.color === "string"
    );
  } catch {
    return DEFAULT_CALENDAR_LABELS;
  }
}

export function writeCalendarLabels(slug: string, labels: CalendarLabel[]): void {
  try {
    window.localStorage.setItem(labelsStorageKey(slug), JSON.stringify(labels));
  } catch {
    // ignore
  }
}

export function bookingMatchesLabel(booking: Booking, label: CalendarLabel): boolean {
  const needle = label.name.toLowerCase();
  const service = booking.service?.toLowerCase() ?? "";
  const customer = booking.customer_name?.toLowerCase() ?? "";
  return service.includes(needle) || customer.includes(needle);
}

export function filterBookingsByLabel(
  bookings: Booking[],
  labelFilter: LabelFilter,
  labels: CalendarLabel[]
): Booking[] {
  if (labelFilter === "all") return bookings;
  const label = labels.find((item) => item.id === labelFilter);
  if (!label) return bookings;
  return bookings.filter((booking) => bookingMatchesLabel(booking, label));
}

export function getBookingEventColor(booking: Booking, labels: CalendarLabel[]): string {
  for (const label of labels) {
    if (bookingMatchesLabel(booking, label)) return label.color;
  }

  const key = booking.service_id ?? booking.service ?? booking.id;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const palette = ["#5a8dee", "#a855f7", "#94a3b8", "#14b8a6", "#ec4899", "#c084fc", "#ef4444", "#84cc16"];
  return palette[Math.abs(hash) % palette.length]!;
}

export function filterBookingsByEventType(
  bookings: Booking[],
  eventType: EventTypeFilter
): Booking[] {
  if (eventType === "events") return bookings;
  return [];
}
