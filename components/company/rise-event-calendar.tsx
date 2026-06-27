"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Plus,
  Tag,
} from "lucide-react";

import { BookingRequestPopover } from "@/components/company/booking-request-popover";
import { ManageLabelsModal } from "@/components/company/event-calendar/manage-labels-modal";
import { RiseCalendarDropdown } from "@/components/company/event-calendar/rise-calendar-dropdown";
import {
  buildMonthGrid,
  type CalendarView,
  formatEventTimeRange,
  formatViewTitle,
  getEventTitle,
  getTimedEventStyle,
  getWeekDays,
  groupBookingsByDay,
  HOUR_LABELS,
  isSameDay,
  isSameMonth,
  listViewDates,
  navigateDate,
  WEEKDAY_HEADERS,
} from "@/lib/calendar/event-calendar";
import {
  DEFAULT_CALENDAR_LABELS,
  EVENT_TYPE_OPTIONS,
  filterBookingsByEventType,
  filterBookingsByLabel,
  getBookingEventColor,
  readCalendarLabels,
  type CalendarLabel,
  type EventTypeFilter,
  type LabelFilter,
} from "@/lib/calendar/event-labels";
import {
  filterCalendarBookings,
  getDayAvailability,
  toDateKey,
} from "@/lib/calendar/schedule";
import { companyBookingFormPath, companyBookingPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { BookingForm, BookingHours } from "@/types/booking-form";
import type { Booking, CompanyService, CompanyWithIndustry } from "@/types/database";
import type { CompanyMember } from "@/lib/services/team";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
const riseNavButtonClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50";

const CALENDAR_VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "month" },
  { value: "week", label: "week" },
  { value: "day", label: "day" },
  { value: "list", label: "list" },
];

const TIMED_VIEW_FIRST_HOUR = 6;
const TIMED_VIEW_LAST_HOUR = 19;
const HOUR_SLOT_HEIGHT = 48;

function EventBar({
  booking,
  slug,
  labels,
  compact = false,
  className,
}: {
  booking: Booking;
  slug: string;
  labels: CalendarLabel[];
  compact?: boolean;
  className?: string;
}) {
  const color = getBookingEventColor(booking, labels);
  const title = getEventTitle(booking);

  return (
    <Link
      href={companyBookingPath(slug, booking.id)}
      className={cn(
        "flex min-w-0 items-center gap-1.5 overflow-hidden rounded px-1.5 text-white transition hover:brightness-95",
        compact ? "h-5 text-[11px]" : "h-6 text-xs",
        className
      )}
      style={{ backgroundColor: color }}
      title={title}
    >
      <Lock className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
      <span className="truncate font-medium">{title}</span>
    </Link>
  );
}

function TimedEventBlock({
  booking,
  slug,
  labels,
  className,
  style,
}: {
  booking: Booking;
  slug: string;
  labels: CalendarLabel[];
  className?: string;
  style?: CSSProperties;
}) {
  const color = getBookingEventColor(booking, labels);
  const title = getEventTitle(booking);

  return (
    <Link
      href={companyBookingPath(slug, booking.id)}
      className={cn(
        "absolute inset-x-1 z-10 flex min-w-0 items-start gap-1.5 overflow-hidden rounded px-2 py-1 text-xs text-white transition hover:brightness-95",
        className
      )}
      style={{ backgroundColor: color, ...style }}
      title={title}
    >
      <Lock className="mt-0.5 h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
      <span className="truncate font-medium leading-tight">{title}</span>
    </Link>
  );
}

function MonthView({
  slug,
  focusDate,
  bookingsByDay,
  bookingHours,
  blockedDates,
  labels,
}: {
  slug: string;
  focusDate: Date;
  bookingsByDay: Map<string, Booking[]>;
  bookingHours: BookingHours | null;
  blockedDates: string[];
  labels: CalendarLabel[];
}) {
  const cells = useMemo(() => buildMonthGrid(focusDate), [focusDate]);
  const today = new Date();

  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="border-r border-slate-100 px-2 py-2 text-center text-xs font-medium text-slate-500 last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid max-h-[640px] grid-cols-7 overflow-y-auto">
        {cells.map((day) => {
          const key = toDateKey(day);
          const dayBookings = bookingsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, focusDate);
          const isToday = isSameDay(day, today);
          const availability = getDayAvailability(day, bookingHours, blockedDates);

          return (
            <div
              key={key}
              className={cn(
                "min-h-[7.5rem] border-b border-r border-slate-100 p-1.5 last:border-r-0",
                !inMonth && "bg-slate-50/80",
                availability.blocked && "bg-red-50/50",
                availability.closed && !availability.blocked && "bg-slate-50/60"
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium",
                    isToday
                      ? "bg-[#5a8dee] text-white"
                      : inMonth
                    ? "text-slate-700"
                    : "text-slate-400"
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayBookings.slice(0, 3).map((booking) => (
                  <EventBar key={booking.id} booking={booking} slug={slug} labels={labels} compact />
                ))}
                {dayBookings.length > 3 ? (
                  <p className="px-1 text-[10px] font-medium text-slate-500">
                    +{dayBookings.length - 3} more
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimedGridView({
  slug,
  days,
  bookingsByDay,
  labels,
  highlightToday = true,
}: {
  slug: string;
  days: Date[];
  bookingsByDay: Map<string, Booking[]>;
  labels: CalendarLabel[];
  highlightToday?: boolean;
}) {
  const today = new Date();
  const hours = HOUR_LABELS.slice(TIMED_VIEW_FIRST_HOUR, TIMED_VIEW_LAST_HOUR);
  const gridHeight = hours.length * HOUR_SLOT_HEIGHT;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div
          className="grid border-b border-slate-100"
          style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="border-r border-slate-100 bg-white" />
          {days.map((day) => {
            const isToday = highlightToday && isSameDay(day, today);
            return (
              <div
                key={toDateKey(day)}
                className={cn(
                  "border-r border-slate-100 px-2 py-2 text-center last:border-r-0",
                  isToday ? "bg-[#fffbeb]" : "bg-white"
                )}
              >
                <p className="text-xs font-medium text-slate-500">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                </p>
              </div>
            );
          })}
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="border-r border-slate-100 bg-white px-2 py-2 text-xs text-slate-500">
            all-day
          </div>
          {days.map((day) => {
            const isToday = highlightToday && isSameDay(day, today);
            return (
              <div
                key={`allday-${toDateKey(day)}`}
                className={cn(
                  "min-h-8 border-b border-r border-slate-100 last:border-r-0",
                  isToday ? "bg-[#fffbeb]" : "bg-white"
                )}
              />
            );
          })}
        </div>

        <div className="relative">
          {hours.map((label, index) => (
            <div
              key={label}
              className="grid border-b border-slate-100"
              style={{
                gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(0, 1fr))`,
                height: HOUR_SLOT_HEIGHT,
              }}
            >
              <div className="relative border-r border-slate-100 bg-white px-2 text-xs text-slate-400">
                <span className={index === 0 ? "block" : "-mt-2 block"}>{label}</span>
              </div>
              {days.map((day) => {
                const isToday = highlightToday && isSameDay(day, today);
                return (
                  <div
                    key={`${toDateKey(day)}-${label}`}
                    className={cn(
                      "border-r border-slate-100 last:border-r-0",
                      isToday ? "bg-[#fffbeb]/70" : "bg-white"
                    )}
                  />
                );
              })}
            </div>
          ))}

          <div
            className="pointer-events-none absolute inset-0 grid"
            style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div />
            {days.map((day) => {
              const key = toDateKey(day);
              const dayBookings = bookingsByDay.get(key) ?? [];
              const isToday = highlightToday && isSameDay(day, today);

              return (
                <div
                  key={`events-${key}`}
                  className={cn("relative pointer-events-auto", isToday && "bg-[#fffbeb]/30")}
                  style={{ height: gridHeight }}
                >
                  {dayBookings.map((booking) => {
                    const style = getTimedEventStyle(booking, {
                      hourHeight: HOUR_SLOT_HEIGHT,
                      firstHour: TIMED_VIEW_FIRST_HOUR,
                      lastHour: TIMED_VIEW_LAST_HOUR,
                    });
                    if (!style) return null;
                    return (
                      <TimedEventBlock
                        key={booking.id}
                        booking={booking}
                        slug={slug}
                        labels={labels}
                        className="pointer-events-auto"
                        style={{ top: style.top, height: style.height }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({
  slug,
  focusDate,
  bookingsByDay,
  labels,
}: {
  slug: string;
  focusDate: Date;
  bookingsByDay: Map<string, Booking[]>;
  labels: CalendarLabel[];
}) {
  const dates = useMemo(
    () => listViewDates(focusDate, bookingsByDay),
    [focusDate, bookingsByDay]
  );

  if (dates.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-slate-500">
        No scheduled events for this view.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {dates.map((day) => {
        const key = toDateKey(day);
        const dayBookings = bookingsByDay.get(key) ?? [];

        return (
          <div key={key}>
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
              <p className="text-sm font-medium text-slate-700">
                {day.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm font-medium text-[#5a8dee]">
                {day.toLocaleDateString("en-US", { weekday: "long" })}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {dayBookings.map((booking) => {
                const color = getBookingEventColor(booking, labels);
                const title = getEventTitle(booking);
                return (
                  <Link
                    key={booking.id}
                    href={companyBookingPath(slug, booking.id)}
                    className="flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50/80"
                  >
                    <p className="w-36 shrink-0 text-sm text-slate-500">
                      {formatEventTimeRange(booking)}
                    </p>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div
                      className="flex min-w-0 flex-1 items-center gap-2 rounded px-3 py-2 text-sm text-white"
                      style={{ backgroundColor: color }}
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} />
                      <span className="truncate font-medium">{title}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RiseEventCalendar({
  slug,
  company,
  bookings,
  services,
  staff: _staff,
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
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [labelFilter, setLabelFilter] = useState<LabelFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("events");
  const [labels, setLabels] = useState<CalendarLabel[]>(DEFAULT_CALENDAR_LABELS);
  const [showManageLabels, setShowManageLabels] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setView("list");
    }
  }, []);

  useEffect(() => {
    setLabels(readCalendarLabels(slug));
  }, [slug]);

  const labelOptions = useMemo(
    () => [
      { value: "all" as LabelFilter, label: "- Event label -" },
      ...labels.map((label) => ({ value: label.id as LabelFilter, label: label.name })),
    ],
    [labels]
  );

  const filteredBookings = useMemo(() => {
    const scheduled = filterCalendarBookings(bookings, "all");
    const byType = filterBookingsByEventType(scheduled, eventTypeFilter);
    return filterBookingsByLabel(byType, labelFilter, labels);
  }, [bookings, eventTypeFilter, labelFilter, labels]);

  const bookingsByDay = useMemo(
    () => groupBookingsByDay(filteredBookings),
    [filteredBookings]
  );

  const weekDays = useMemo(() => getWeekDays(focusDate), [focusDate]);

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

  const goToday = () => setFocusDate(new Date());
  const goPrevious = () => setFocusDate((current) => navigateDate(current, view, -1));
  const goNext = () => setFocusDate((current) => navigateDate(current, view, 1));

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-lg font-medium text-slate-800">Event calendar</h1>

          <div className="flex flex-wrap items-center gap-2">
            <RiseCalendarDropdown
              value={labelFilter}
              onChange={setLabelFilter}
              options={labelOptions}
              placeholder="- Event label -"
              searchable
              ariaLabel="Event label"
            />

            <RiseCalendarDropdown
              value={eventTypeFilter}
              onChange={setEventTypeFilter}
              options={EVENT_TYPE_OPTIONS}
              placeholder="Event type"
              ariaLabel="Event type"
            />

            <button
              type="button"
              className={riseOutlineButtonClassName}
              onClick={() => setShowManageLabels(true)}
            >
              <Tag className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
              Manage labels
            </button>

            {bookingForm ? (
              <button
                type="button"
                className={riseOutlineButtonClassName}
                aria-expanded={showBookingForm}
                aria-haspopup="dialog"
                onClick={() => setShowBookingForm((value) => !value)}
              >
                <Plus className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
                Add event
              </button>
            ) : (
              <Link href={companyBookingFormPath(slug)} className={riseOutlineButtonClassName}>
                <Plus className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
                Add event
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevious}
              className={riseNavButtonClassName}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={goNext}
              className={riseNavButtonClassName}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              today
            </button>
          </div>

          <h2 className="text-center text-lg font-normal text-slate-700 sm:text-xl">
            {formatViewTitle(focusDate, view)}
          </h2>

          <div className="inline-flex max-w-full overflow-x-auto rounded-md border border-slate-200 bg-white">
            {CALENDAR_VIEWS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setView(item.value)}
                className={cn(
                  "px-3 py-1.5 text-sm capitalize transition",
                  view === item.value
                    ? "bg-[#5a8dee] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[420px]">
          {view === "month" ? (
            <MonthView
              slug={slug}
              focusDate={focusDate}
              bookingsByDay={bookingsByDay}
              bookingHours={bookingHours}
              blockedDates={blockedDates}
              labels={labels}
            />
          ) : null}

          {view === "week" ? (
            <TimedGridView slug={slug} days={weekDays} bookingsByDay={bookingsByDay} labels={labels} />
          ) : null}

          {view === "day" ? (
            <TimedGridView
              slug={slug}
              days={[focusDate]}
              bookingsByDay={bookingsByDay}
              labels={labels}
            />
          ) : null}

          {view === "list" ? (
            <ListView slug={slug} focusDate={focusDate} bookingsByDay={bookingsByDay} labels={labels} />
          ) : null}
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

      <ManageLabelsModal
        open={showManageLabels}
        onClose={() => setShowManageLabels(false)}
        slug={slug}
        onLabelsChange={setLabels}
      />
    </div>
  );
}
