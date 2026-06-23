import type { BookingHours } from "@/types/booking-form";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const DEFAULT_HOURS: BookingHours = {
  mon: { open: "09:00", close: "17:00" },
  tue: { open: "09:00", close: "17:00" },
  wed: { open: "09:00", close: "17:00" },
  thu: { open: "09:00", close: "17:00" },
  fri: { open: "09:00", close: "17:00" },
  sat: { closed: true, open: "09:00", close: "13:00" },
  sun: { closed: true, open: "09:00", close: "13:00" },
};

function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function defaultBookingHours(): BookingHours {
  return { ...DEFAULT_HOURS };
}

export function validateBookingAvailability(input: {
  bookingDateIso: string;
  bookingHours?: BookingHours | Record<string, unknown> | null;
  blockedDates?: string[] | null;
}): { ok: true } | { ok: false; error: string } {
  const date = new Date(input.bookingDateIso);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Invalid booking date." };
  }

  const dateKey = date.toISOString().slice(0, 10);
  const blocked = input.blockedDates ?? [];
  if (blocked.includes(dateKey)) {
    return { ok: false, error: "This date is not available for bookings." };
  }

  const hours = (input.bookingHours as BookingHours | null) ?? DEFAULT_HOURS;
  const dayKey = DAY_KEYS[date.getDay()];
  const day = hours[dayKey];

  if (!day || day.closed) {
    return { ok: false, error: "Bookings are not accepted on this day." };
  }

  const openMinutes = parseTime(day.open);
  const closeMinutes = parseTime(day.close);
  if (openMinutes == null || closeMinutes == null || closeMinutes <= openMinutes) {
    return { ok: true };
  }

  const bookingMinutes = date.getHours() * 60 + date.getMinutes();
  if (bookingMinutes < openMinutes || bookingMinutes > closeMinutes) {
    return {
      ok: false,
      error: `Bookings are only accepted between ${day.open} and ${day.close}.`,
    };
  }

  return { ok: true };
}
