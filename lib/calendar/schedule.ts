import type { BookingHours } from "@/types/booking-form";
import type { Booking } from "@/types/database";
import type { BookingStatus } from "@/lib/bookings/status";

export const CALENDAR_BOOKING_STATUSES: BookingStatus[] = [
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
];

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export type DayAvailability = {
  closed: boolean;
  blocked: boolean;
  hoursLabel: string | null;
};

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDayAvailability(
  date: Date,
  bookingHours: BookingHours | Record<string, unknown> | null | undefined,
  blockedDates: string[] | null | undefined
): DayAvailability {
  const dateKey = toDateKey(date);
  const blocked = (blockedDates ?? []).includes(dateKey);
  if (blocked) {
    return { closed: false, blocked: true, hoursLabel: null };
  }

  const hours = bookingHours as BookingHours | null | undefined;
  const dayKey = DAY_KEYS[date.getDay()];
  const day = hours?.[dayKey];

  if (!day || day.closed) {
    return { closed: true, blocked: false, hoursLabel: null };
  }

  return {
    closed: false,
    blocked: false,
    hoursLabel: day.open && day.close ? `${day.open}–${day.close}` : null,
  };
}

export type StaffFilter = "all" | "unassigned" | string;

export function filterCalendarBookings(
  bookings: Booking[],
  staffFilter: StaffFilter
): Booking[] {
  const scheduled = bookings.filter((booking) =>
    CALENDAR_BOOKING_STATUSES.includes((booking.status ?? "") as BookingStatus)
  );

  if (staffFilter === "all") return scheduled;
  if (staffFilter === "unassigned") {
    return scheduled.filter((booking) => !booking.assigned_staff_id);
  }
  return scheduled.filter((booking) => booking.assigned_staff_id === staffFilter);
}

export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}
