"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState, useTransition } from "react";

import { createBookingForCompany } from "@/app/actions/bookings";
import { updateBookingStatus } from "@/app/actions/company";
import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUSES,
  bookingStatusBadgeClass,
  type BookingStatus,
} from "@/lib/bookings/status";
import { companyBookingPath, companyCustomerPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { Booking, CompanyService, CompanyWithIndustry } from "@/types/database";

type StatusFilter = "all" | BookingStatus;

function statusBadgeClass(status: string | null): string {
  return bookingStatusBadgeClass(status);
}

export function CompanyBookingsClient({
  slug,
  company,
  bookings: initialBookings,
  services,
}: {
  slug: string;
  company: CompanyWithIndustry;
  bookings: Booking[];
  services: CompanyService[];
}) {
  const [rows, setRows] = useState(initialBookings);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [serviceText, setServiceText] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isUpdating, startUpdate] = useTransition();

  const selectedService = services.find((s) => s.id === serviceId);

  const filteredRows = useMemo(() => {
    let result = rows;
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
  }, [rows, statusFilter, searchQuery, dateFrom]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const service = selectedService?.name ?? serviceText;
      const result = await createBookingForCompany({
        companyId: company.id,
        companySlug: slug,
        customerName,
        service,
        bookingDate,
        customerEmail,
        customerPhone,
        serviceId: selectedService?.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) => [
        {
          id: crypto.randomUUID(),
          company_id: company.id,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || null,
          customer_phone: customerPhone.trim() || null,
          service: service.trim(),
          booking_date: new Date(bookingDate).toISOString(),
          status: "pending",
          source: "internal",
          service_id: selectedService?.id ?? null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setServiceId("");
      setServiceText("");
      setBookingDate("");
    } finally {
      setPending(false);
    }
  };

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
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Operations
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Bookings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Create bookings and track their status through completion.
        </p>
      </header>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-3"
      >
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Customer name"
          required
        />
        <input
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          type="email"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Email (optional)"
        />
        <input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Phone (optional)"
        />
        {services.length > 0 ? (
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Custom service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : null}
        {!serviceId ? (
          <input
            value={serviceText}
            onChange={(e) => setServiceText(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Service"
            required
          />
        ) : (
          <input
            value={selectedService?.name ?? ""}
            readOnly
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600"
          />
        )}
        <input
          value={bookingDate}
          onChange={(e) => setBookingDate(e.target.value)}
          type="datetime-local"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          required
        />
        <Button type="submit" className="rounded-xl lg:col-span-3" disabled={pending}>
          {pending ? "Creating..." : "Create booking"}
        </Button>
      </form>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2">
        {(["all", ...BOOKING_STATUSES] as StatusFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
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

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search name, email, phone, service…"
        />
        <input
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          type="date"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          title="From date"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0 ? "No bookings yet." : "No bookings match this filter."}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
