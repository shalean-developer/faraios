"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { updateBookingDetails } from "@/app/actions/booking-form";
import { updateBookingStatus } from "@/app/actions/company";
import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUSES,
  bookingStatusBadgeClass,
  type BookingStatus,
} from "@/lib/bookings/status";
import { companyBookingsPath, companyCustomerPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { Booking, CompanyWithIndustry } from "@/types/database";
import type { BookingActivity } from "@/lib/services/booking-activities";
import type { CompanyMember } from "@/lib/services/team";

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(cents / 100);
}

export function CompanyBookingDetailClient({
  slug,
  company,
  booking: initialBooking,
  staff,
  activities,
}: {
  slug: string;
  company: CompanyWithIndustry;
  booking: Booking;
  staff: CompanyMember[];
  activities: BookingActivity[];
}) {
  const [booking, setBooking] = useState(initialBooking);
  const [internalNotes, setInternalNotes] = useState(booking.internal_notes ?? "");
  const [assignedStaffId, setAssignedStaffId] = useState(booking.assigned_staff_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUpdating, startUpdate] = useTransition();

  const customResponses = (booking.custom_responses ?? {}) as Record<string, unknown>;

  const onStatusChange = (status: BookingStatus) => {
    startUpdate(async () => {
      const result = await updateBookingStatus({
        bookingId: booking.id,
        companyId: company.id,
        companySlug: slug,
        status,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBooking((prev) => ({ ...prev, status }));
      setSuccess("Status updated.");
    });
  };

  const onSaveDetails = async () => {
    setError(null);
    setSuccess(null);
    const result = await updateBookingDetails({
      bookingId: booking.id,
      companyId: company.id,
      companySlug: slug,
      assignedStaffId: assignedStaffId || null,
      internalNotes,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBooking((prev) => ({
      ...prev,
      assigned_staff_id: assignedStaffId || null,
      internal_notes: internalNotes,
    }));
    setSuccess("Booking details saved.");
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={companyBookingsPath(slug)}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to bookings
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Booking
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {booking.service ?? "Booking"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {booking.booking_date
              ? new Date(booking.booking_date).toLocaleString("en-ZA")
              : "—"}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold capitalize",
            bookingStatusBadgeClass(booking.status)
          )}
        >
          {booking.status ?? "pending"}
        </span>
      </header>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mb-4 text-sm text-emerald-600">{success}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Customer</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">
                {booking.customer_id ? (
                  <Link
                    href={companyCustomerPath(slug, booking.customer_id)}
                    className="text-violet-700 hover:text-violet-900"
                  >
                    {booking.customer_name}
                  </Link>
                ) : (
                  booking.customer_name
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{booking.customer_email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd>{booking.customer_phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Address</dt>
              <dd>{booking.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Notes</dt>
              <dd>{booking.notes ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Booking details</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="capitalize">{booking.source ?? "internal"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Source website</dt>
              <dd>{booking.source_website ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Price estimate</dt>
              <dd>{formatMoney(booking.price_cents)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Duration</dt>
              <dd>
                {booking.duration_minutes
                  ? `${booking.duration_minutes} min`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Payment status</dt>
              <dd className="capitalize">{booking.payment_status ?? "unpaid"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd>
                {booking.created_at
                  ? new Date(booking.created_at).toLocaleString("en-ZA")
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        {Object.keys(customResponses).length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="font-semibold text-slate-900">Custom form responses</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(customResponses).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="mt-1 text-slate-800">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Manage booking</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Status</span>
              <select
                value={(booking.status as BookingStatus) ?? "pending"}
                onChange={(e) => onStatusChange(e.target.value as BookingStatus)}
                disabled={isUpdating}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                {BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Assigned staff</span>
              <select
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">Unassigned</option>
                {staff.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name || member.email || member.user_id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Internal notes</span>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <Button className="mt-4 rounded-xl" onClick={onSaveDetails}>
            Save assignment & notes
          </Button>
        </section>

        {activities.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="font-semibold text-slate-900">Activity history</h2>
            <ul className="mt-4 space-y-3">
              {activities.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3 text-sm last:border-0"
                >
                  <span className="text-slate-800">{item.message}</span>
                  <time className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString("en-ZA")}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
