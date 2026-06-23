export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "rescheduled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function bookingStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "confirmed":
      return "bg-blue-50 text-blue-700";
    case "assigned":
      return "bg-indigo-50 text-indigo-700";
    case "in_progress":
      return "bg-violet-50 text-violet-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    case "rescheduled":
      return "bg-orange-50 text-orange-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "assigned",
  "in_progress",
  "rescheduled",
];
