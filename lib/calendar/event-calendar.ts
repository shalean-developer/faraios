import type { Booking } from "@/types/database";

import { toDateKey } from "@/lib/calendar/schedule";

export type CalendarView = "month" | "week" | "day" | "list";

export const EVENT_BAR_COLORS = [
  "#5a8dee",
  "#a855f7",
  "#94a3b8",
  "#14b8a6",
  "#ec4899",
  "#c084fc",
  "#ef4444",
  "#84cc16",
] as const;

export const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const HOUR_LABELS = [
  "12am",
  "1am",
  "2am",
  "3am",
  "4am",
  "5am",
  "6am",
  "7am",
  "8am",
  "9am",
  "10am",
  "11am",
  "12pm",
  "1pm",
  "2pm",
  "3pm",
  "4pm",
  "5pm",
  "6pm",
  "7pm",
  "8pm",
  "9pm",
  "10pm",
  "11pm",
] as const;

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function startOfWeekSunday(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - next.getDay());
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getEventColor(booking: Booking): string {
  const key = booking.service_id ?? booking.service ?? booking.id;
  return EVENT_BAR_COLORS[hashString(key) % EVENT_BAR_COLORS.length]!;
}

export function getEventTitle(booking: Booking): string {
  const service = booking.service?.trim();
  const customer = booking.customer_name?.trim();
  if (service && customer) return `${service} — ${customer}`;
  return service || customer || "Scheduled job";
}

export function getBookingStart(booking: Booking): Date | null {
  if (!booking.booking_date) return null;
  const start = new Date(booking.booking_date);
  return Number.isNaN(start.getTime()) ? null : start;
}

export function getBookingEnd(booking: Booking): Date | null {
  const start = getBookingStart(booking);
  if (!start) return null;
  const duration = booking.duration_minutes && booking.duration_minutes > 0 ? booking.duration_minutes : 60;
  return new Date(start.getTime() + duration * 60_000);
}

export function formatEventTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatEventTimeRange(booking: Booking): string {
  const start = getBookingStart(booking);
  const end = getBookingEnd(booking);
  if (!start) return "All day";
  if (!end) return formatEventTime(start);
  return `${formatEventTime(start)} - ${formatEventTime(end)}`;
}

export function formatViewTitle(date: Date, view: CalendarView): string {
  if (view === "month" || view === "list") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  if (view === "day") {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const weekStart = startOfWeekSunday(date);
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = weekEnd.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function navigateDate(date: Date, view: CalendarView, direction: -1 | 1): Date {
  if (view === "month" || view === "list") return addMonths(date, direction);
  if (view === "week") return addDays(date, direction * 7);
  return addDays(date, direction);
}

export function buildMonthGrid(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeekSunday(monthStart);
  const cells: Date[] = [];

  for (let i = 0; i < 42; i += 1) {
    cells.push(addDays(gridStart, i));
  }

  return cells;
}

export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeekSunday(date);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function groupBookingsByDay(bookings: Booking[]): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>();

  for (const booking of bookings) {
    const start = getBookingStart(booking);
    if (!start) continue;
    const key = toDateKey(start);
    const list = map.get(key) ?? [];
    list.push(booking);
    map.set(key, list);
  }

  for (const [key, list] of map) {
    list.sort((a, b) => {
      const aTime = getBookingStart(a)?.getTime() ?? 0;
      const bTime = getBookingStart(b)?.getTime() ?? 0;
      return aTime - bTime;
    });
    map.set(key, list);
  }

  return map;
}

export function listViewDates(date: Date, bookingsByDay: Map<string, Booking[]>): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const dates: Date[] = [];

  for (let day = monthStart.getDate(); day <= monthEnd.getDate(); day += 1) {
    const current = new Date(date.getFullYear(), date.getMonth(), day);
    const key = toDateKey(current);
    if ((bookingsByDay.get(key)?.length ?? 0) > 0) {
      dates.push(current);
    }
  }

  return dates;
}

export type ServiceFilter = "all" | string;

export function filterBookingsByService(bookings: Booking[], serviceFilter: ServiceFilter): Booking[] {
  if (serviceFilter === "all") return bookings;
  return bookings.filter((booking) => (booking.service ?? "") === serviceFilter);
}

export function uniqueServices(bookings: Booking[]): string[] {
  const services = new Set<string>();
  for (const booking of bookings) {
    const service = booking.service?.trim();
    if (service) services.add(service);
  }
  return Array.from(services).sort((a, b) => a.localeCompare(b));
}

export function getTimedEventStyle(
  booking: Booking,
  options: { hourHeight: number; firstHour?: number; lastHour?: number } = {
    hourHeight: 48,
    firstHour: 0,
    lastHour: 24,
  }
): { top: number; height: number } | null {
  const start = getBookingStart(booking);
  if (!start) return null;

  const firstHour = options.firstHour ?? 0;
  const lastHour = options.lastHour ?? 24;
  const totalMinutes = (lastHour - firstHour) * 60;
  const startMinutes = start.getHours() * 60 + start.getMinutes() - firstHour * 60;
  const duration = booking.duration_minutes && booking.duration_minutes > 0 ? booking.duration_minutes : 60;

  if (startMinutes + duration <= 0 || startMinutes >= totalMinutes) {
    return null;
  }

  const clampedStart = Math.max(0, startMinutes);
  const clampedEnd = Math.min(totalMinutes, startMinutes + duration);
  const top = (clampedStart / 60) * options.hourHeight;
  const height = Math.max(((clampedEnd - clampedStart) / 60) * options.hourHeight, 22);

  return { top, height };
}
