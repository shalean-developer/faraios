"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookingRequestPopover } from "@/components/company/booking-request-popover";
import { Button } from "@/components/ui/button";
import { bookingStatusBadgeClass } from "@/lib/bookings/status";
import {
  filterCalendarBookings,
  formatDuration,
  getDayAvailability,
  type StaffFilter,
} from "@/lib/calendar/schedule";
import { companyBookingFormPath, companyBookingPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { BookingForm, BookingHours } from "@/types/booking-form";
import type { Booking, CompanyService, CompanyWithIndustry } from "@/types/database";
import type { CompanyMember } from "@/lib/services/team";

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

function staffLabel(member: CompanyMember): string {
  return member.full_name?.trim() || member.email;
}

export function CompanyCalendarClient({
  slug,
  company,
  bookings,
  services,
  staff,
  bookingForm,
  bookingHours,
  blockedDates,
}: {
  slug: string;
  company: CompanyWithIndustry;
  bookings: Booking[];
  services: CompanyService[];
  staff: CompanyMember[];
  bookingForm: BookingForm | null;
  bookingHours: BookingHours | null;
  blockedDates: string[];
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [staffFilter, setStaffFilter] = useState<StaffFilter>("all");
  const [showBookingForm, setShowBookingForm] = useState(false);

  const staffNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of staff) {
      map.set(member.user_id, staffLabel(member));
    }
    return map;
  }, [staff]);

  const scheduledBookings = useMemo(
    () => filterCalendarBookings(bookings, staffFilter),
    [bookings, staffFilter]
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const day of days) {
      map.set(day.toDateString(), []);
    }
    for (const booking of scheduledBookings) {
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
  }, [scheduledBookings, days]);

  useEffect(() => {
    if (!showBookingForm) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowBookingForm(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showBookingForm]);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Schedule
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="mt-2 text-sm text-slate-500">
            Confirmed jobs and team schedule. Incoming requests stay under Bookings.
          </p>
        </div>
        {bookingForm ? (
          <Button
            type="button"
            className="shrink-0 rounded-xl"
            variant={showBookingForm ? "outline" : "default"}
            aria-expanded={showBookingForm}
            aria-haspopup="dialog"
            onClick={() => setShowBookingForm((value) => !value)}
          >
            Booking Request
          </Button>
        ) : (
          <Link
            href={companyBookingFormPath(slug)}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700"
          >
            Set up booking form
          </Link>
        )}
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">Staff</span>
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All staff</option>
            <option value="unassigned">Unassigned</option>
            {staff.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {staffLabel(member)}
              </option>
            ))}
          </select>
        </label>

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
      </div>

      {bookingForm ? (
        <BookingRequestPopover
          open={showBookingForm}
          onClose={() => setShowBookingForm(false)}
          slug={slug}
          company={company}
          bookingForm={bookingForm}
          services={services}
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((day) => {
          const key = day.toDateString();
          const dayBookings = bookingsByDay.get(key) ?? [];
          const isToday = key === new Date().toDateString();
          const availability = getDayAvailability(day, bookingHours, blockedDates);

          return (
            <div
              key={key}
              className={cn(
                "min-h-[240px] rounded-2xl border bg-white p-3 shadow-sm",
                availability.blocked && "border-red-200 bg-red-50/40",
                availability.closed && !availability.blocked && "border-slate-200 bg-slate-50",
                !availability.closed &&
                  !availability.blocked &&
                  (isToday
                    ? "border-violet-300 ring-2 ring-violet-100"
                    : "border-slate-200")
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {day.toLocaleDateString("en-ZA", { weekday: "short" })}
                  </p>
                  <p className="text-lg font-bold text-slate-900">{day.getDate()}</p>
                </div>
                {availability.blocked ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                    Blocked
                  </span>
                ) : availability.closed ? (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Closed
                  </span>
                ) : availability.hoursLabel ? (
                  <span className="text-[10px] font-medium text-slate-400">
                    {availability.hoursLabel}
                  </span>
                ) : null}
              </div>

              <ul className="mt-3 space-y-2">
                {dayBookings.length === 0 ? (
                  <li className="text-xs text-slate-400">
                    {availability.blocked || availability.closed
                      ? "Unavailable"
                      : "No scheduled jobs"}
                  </li>
                ) : (
                  dayBookings.map((booking) => {
                    const duration = formatDuration(booking.duration_minutes);
                    const assignee = booking.assigned_staff_id
                      ? staffNameByUserId.get(booking.assigned_staff_id) ?? "Assigned"
                      : null;

                    return (
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
                            {duration ? ` · ${duration}` : ""}
                          </p>
                          <p className="truncate font-medium text-slate-800">
                            {booking.customer_name ?? "Customer"}
                          </p>
                          <p className="truncate text-slate-600">{booking.service}</p>
                          {booking.address ? (
                            <p className="truncate text-slate-500">{booking.address}</p>
                          ) : null}
                          {assignee ? (
                            <p className="truncate text-slate-500">{assignee}</p>
                          ) : (
                            <p className="text-amber-600">Unassigned</p>
                          )}
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
                    );
                  })
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
