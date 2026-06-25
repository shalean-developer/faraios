"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";

import { CompanyQuotesSection, CompanyQuoteCreateForm } from "@/app/[company]/dashboard/bookings/company-quotes-section";
import { updateBookingStatus } from "@/app/actions/company";
import { BookingRequestPopover } from "@/components/company/booking-request-popover";
import { CompanyDashboardHeader } from "@/components/company/company-dashboard-header";
import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUSES,
  bookingStatusBadgeClass,
  type BookingStatus,
} from "@/lib/bookings/status";
import {
  filterBookingRequests,
  type BookingsView,
} from "@/lib/bookings/request-type";
import { quoteStatusBadgeClass } from "@/lib/financial/status";
import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyBookingFormPath,
  companyBookingPath,
  companyCustomerPath,
  companyQuotePath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { BookingForm } from "@/types/booking-form";
import type {
  Booking,
  CompanyService,
  CompanyWithIndustry,
  Customer,
} from "@/types/database";
import type { QuoteWithCustomer } from "@/types/financial";
import type { CompanyNotification } from "@/types/v6-engine";

type StatusFilter = "all" | BookingStatus;

type InboxItem =
  | {
      kind: "booking";
      sortDate: string;
      booking: Booking;
    }
  | {
      kind: "quote";
      sortDate: string;
      quote: QuoteWithCustomer;
    };

const VIEW_COPY: Record<
  BookingsView,
  { title: string; description: string }
> = {
  all: {
    title: "Bookings — All",
    description:
      "Overview of all incoming booking requests and quotes in one place.",
  },
  "booking-requests": {
    title: "Bookings",
    description: "Review incoming booking requests from your website and forms.",
  },
  "quote-requests": {
    title: "Bookings",
    description: "Review quote requests and create quotes on behalf of customers.",
  },
};

function statusBadgeClass(status: string | null): string {
  return bookingStatusBadgeClass(status);
}

function sortTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function CompanyBookingsClient({
  slug,
  company,
  bookings: initialBookings,
  services,
  quotes,
  customers,
  bookingForm = null,
  view = "all",
  userDisplayName = "there",
  notifications = [],
  unreadCount = 0,
}: {
  slug: string;
  company: CompanyWithIndustry;
  bookings: Booking[];
  services: CompanyService[];
  quotes: QuoteWithCustomer[];
  customers: Customer[];
  bookingForm?: BookingForm | null;
  view?: BookingsView;
  userDisplayName?: string;
  notifications?: CompanyNotification[];
  unreadCount?: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialBookings);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, startUpdate] = useTransition();

  const copy = VIEW_COPY[view];

  useEffect(() => {
    const overlayOpen = showBookingForm || showQuoteForm;
    if (!overlayOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowBookingForm(false);
        setShowQuoteForm(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showBookingForm, showQuoteForm]);

  const bookingRequestRows = useMemo(
    () => filterBookingRequests(rows),
    [rows]
  );

  const filteredBookingRows = useMemo(() => {
    let result = bookingRequestRows;
    if (statusFilter !== "all") {
      result = result.filter((row) => (row.status ?? "pending") === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((row) => {
        const haystack = [
          row.customer_name,
          row.customer_email,
          row.customer_phone,
          row.service,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!Number.isNaN(from.getTime())) {
        result = result.filter((row) => {
          const d = new Date(row.booking_date ?? "");
          return !Number.isNaN(d.getTime()) && d >= from;
        });
      }
    }
    return result;
  }, [bookingRequestRows, statusFilter, searchQuery, dateFrom]);

  const filteredQuotes = useMemo(() => {
    let result = quotes;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((quote) => {
        const haystack = [
          quote.quote_number,
          quote.customers?.name,
          quote.customers?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!Number.isNaN(from.getTime())) {
        result = result.filter((quote) => {
          const d = new Date(quote.created_at);
          return !Number.isNaN(d.getTime()) && d >= from;
        });
      }
    }
    return result;
  }, [quotes, searchQuery, dateFrom]);

  const inboxItems = useMemo(() => {
    const items: InboxItem[] = [
      ...filteredBookingRows.map((booking) => ({
        kind: "booking" as const,
        sortDate: booking.created_at ?? booking.booking_date ?? "",
        booking,
      })),
      ...filteredQuotes.map((quote) => ({
        kind: "quote" as const,
        sortDate: quote.created_at,
        quote,
      })),
    ];
    return items.sort((a, b) => sortTimestamp(b.sortDate) - sortTimestamp(a.sortDate));
  }, [filteredBookingRows, filteredQuotes]);

  const onStatusChange = (bookingId: string, status: BookingStatus) => {
    startUpdate(async () => {
      const result = await updateBookingStatus({
        bookingId,
        companyId: company.id,
        companySlug: slug,
        status,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((row) => (row.id === bookingId ? { ...row, status } : row))
      );
    });
  };

  return (
    <>
      <CompanyDashboardHeader
        slug={slug}
        companyId={company.id}
        userDisplayName={userDisplayName}
        companyName={company.name}
        notifications={notifications}
        unreadCount={unreadCount}
      />
      <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{copy.description}</p>
        </div>
        {view === "booking-requests" ? (
          bookingForm ? (
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
          )
        ) : null}
        {view === "quote-requests" ? (
          <Button
            type="button"
            className="shrink-0 rounded-xl"
            variant={showQuoteForm ? "outline" : "default"}
            aria-expanded={showQuoteForm}
            aria-haspopup="dialog"
            onClick={() => setShowQuoteForm((value) => !value)}
          >
            Quote Request
          </Button>
        ) : null}
      </header>

      {view === "booking-requests" && bookingForm ? (
        <BookingRequestPopover
          open={showBookingForm}
          onClose={() => setShowBookingForm(false)}
          slug={slug}
          company={company}
          bookingForm={bookingForm}
          services={services}
        />
      ) : null}

      {view === "quote-requests" && showQuoteForm ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            aria-label="Close quote form"
            onClick={() => setShowQuoteForm(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-request-popover-title"
            className="relative z-10 flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <p
                id="quote-request-popover-title"
                className="text-sm font-semibold text-slate-900"
              >
                Create quote request
              </p>
              <button
                type="button"
                onClick={() => setShowQuoteForm(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-4">
              <CompanyQuoteCreateForm
                slug={slug}
                companyId={company.id}
                customers={customers}
                embedded
                onSuccess={() => {
                  setShowQuoteForm(false);
                  router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      {view === "booking-requests" ? (
        <>
          <BookingFilters
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            showStatusFilters
          />
          <BookingsTable
            slug={slug}
            rows={filteredBookingRows}
            emptyMessage={
              bookingRequestRows.length === 0
                ? "No booking requests yet."
                : "No booking requests match this filter."
            }
            editableStatus
            isUpdating={isUpdating}
            onStatusChange={onStatusChange}
          />
        </>
      ) : null}

      {view === "all" ? (
        <>
          <BookingFilters
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
          />
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inboxItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      No booking requests or quotes yet.
                    </td>
                  </tr>
                ) : (
                  inboxItems.map((item) =>
                    item.kind === "booking" ? (
                      <tr key={`booking-${item.booking.id}`} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            Booking request
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={companyBookingPath(slug, item.booking.id)}
                            className="font-medium text-violet-700 hover:text-violet-900"
                          >
                            {item.booking.customer_name ?? "—"}
                          </Link>
                          {item.booking.customer_email ? (
                            <p className="text-xs text-slate-500">{item.booking.customer_email}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.booking.service ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {new Date(item.booking.booking_date ?? "").toLocaleString("en-ZA")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                              statusBadgeClass(item.booking.status)
                            )}
                          >
                            {item.booking.status ?? "pending"}
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr key={`quote-${item.quote.id}`} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                            Quote
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={companyQuotePath(slug, item.quote.id)}
                            className="font-medium text-violet-700 hover:text-violet-900"
                          >
                            {item.quote.customers?.name ?? "—"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.quote.quote_number} · {formatRevenue(item.quote.total_cents)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {new Date(item.quote.created_at).toLocaleString("en-ZA")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                              quoteStatusBadgeClass(item.quote.status)
                            )}
                          >
                            {item.quote.status}
                          </span>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {view === "quote-requests" ? (
        <>
          <BookingFilters
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
          />
          <CompanyQuotesSection
            slug={slug}
            companyId={company.id}
            quotes={filteredQuotes}
            customers={customers}
            showCreateForm={false}
            showHeader={false}
          />
        </>
      ) : null}
      </div>
    </>
  );
}

function BookingFilters({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  dateFrom,
  onDateFromChange,
  showStatusFilters = false,
}: {
  statusFilter?: StatusFilter;
  onStatusFilterChange?: (value: StatusFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  showStatusFilters?: boolean;
}) {
  return (
    <>
      {showStatusFilters && statusFilter != null && onStatusFilterChange ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", ...BOOKING_STATUSES] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onStatusFilterChange(filter)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
                statusFilter === filter
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search customer, service, quote…"
        />
        <input
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          type="date"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          title="From date"
        />
      </div>
    </>
  );
}

function BookingsTable({
  slug,
  rows,
  emptyMessage,
  editableStatus,
  isUpdating,
  onStatusChange,
}: {
  slug: string;
  rows: Booking[];
  emptyMessage: string;
  editableStatus: boolean;
  isUpdating: boolean;
  onStatusChange: (bookingId: string, status: BookingStatus) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Service</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <Link
                    href={companyBookingPath(slug, row.id)}
                    className="font-medium text-violet-700 hover:text-violet-900"
                  >
                    {row.customer_name ?? "—"}
                  </Link>
                  {row.customer_id ? (
                    <Link
                      href={companyCustomerPath(slug, row.customer_id)}
                      className="block text-xs text-slate-500 hover:text-violet-700"
                    >
                      View customer
                    </Link>
                  ) : null}
                  {row.customer_email ? (
                    <p className="text-xs text-slate-500">{row.customer_email}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-700">{row.service ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">
                  {new Date(row.booking_date ?? "").toLocaleString("en-ZA")}
                </td>
                <td className="px-4 py-3 capitalize text-slate-600">
                  {row.source ?? "internal"}
                </td>
                <td className="px-4 py-3">
                  {editableStatus ? (
                    <select
                      value={(row.status as BookingStatus) ?? "pending"}
                      onChange={(e) =>
                        onStatusChange(row.id, e.target.value as BookingStatus)
                      }
                      disabled={isUpdating}
                      className={cn(
                        "rounded-full border-0 px-2.5 py-1 text-xs font-semibold capitalize",
                        statusBadgeClass(row.status)
                      )}
                    >
                      {BOOKING_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        statusBadgeClass(row.status)
                      )}
                    >
                      {row.status ?? "pending"}
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
