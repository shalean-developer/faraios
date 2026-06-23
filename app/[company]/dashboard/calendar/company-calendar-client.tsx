"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { bookingStatusBadgeClass } from "@/lib/bookings/status";
import { companyBookingPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types/database";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function CompanyCalendarClient({
  slug,
  bookings,
}: {
  slug: string;
  bookings: Booking[];
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const day of days) {
      map.set(day.toDateString(), []);
    }
    for (const booking of bookings) {
      if (!booking.booking_date) continue;
      const key = new Date(booking.booking_date).toDateString();
      if (map.has(key)) {
        map.get(key)?.push(booking);
      }
    }
    for (const [key, list] of map) {
      list.sort(
        (a, b) =>
          new Date(a.booking_date ?? 0).getTime() -
          new Date(b.booking_date ?? 0).getTime()
      );
      map.set(key, list);
    }
    return map;
  }, [bookings, days]);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Schedule
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Calendar</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
          >
            Previous week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
          >
            Next week
          </button>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((day) => {
          const key = day.toDateString();
          const dayBookings = bookingsByDay.get(key) ?? [];
          const isToday = key === new Date().toDateString();

          return (
            <div
              key={key}
              className={cn(
                "min-h-[220px] rounded-2xl border bg-white p-3 shadow-sm",
                isToday ? "border-violet-300 ring-2 ring-violet-100" : "border-slate-200"
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {day.toLocaleDateString("en-ZA", { weekday: "short" })}
              </p>
              <p className="text-lg font-bold text-slate-900">{day.getDate()}</p>
              <ul className="mt-3 space-y-2">
                {dayBookings.length === 0 ? (
                  <li className="text-xs text-slate-400">No bookings</li>
                ) : (
                  dayBookings.map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={companyBookingPath(slug, booking.id)}
                        className="block rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs hover:border-violet-200"
                      >
                        <p className="font-semibold text-slate-900">
                          {new Date(booking.booking_date ?? "").toLocaleTimeString(
                            "en-ZA",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                        <p className="truncate text-slate-700">{booking.service}</p>
                        <span
                          className={cn(
                            "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                            bookingStatusBadgeClass(booking.status)
                          )}
                        >
                          {booking.status}
                        </span>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
