import Link from "next/link";
import { notFound } from "next/navigation";

import { bookingStatusBadgeClass } from "@/lib/bookings/status";
import { formatDuration } from "@/lib/calendar/schedule";
import { formatRevenue } from "@/lib/operations/metrics";
import { companyBookingPath, companyServicesPath } from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import {
  getServiceById,
  getServiceStatsForCompany,
  listBookingsForService,
} from "@/lib/services/company-services";
import { cn } from "@/lib/utils";
import type { ServiceAddon } from "@/types/booking-form";

type Props = {
  params: Promise<{ company: string; id: string }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Service — Shalean",
  robots: { index: false, follow: false },
};

export default async function CompanyServiceDetailPage({ params }: Props) {
  const { company, id } = await params;
  const slug = decodeURIComponent(company);
  const serviceId = decodeURIComponent(id);

  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const service = await getServiceById(row.id, serviceId);
  if (!service) notFound();

  const [bookings, statsMap] = await Promise.all([
    listBookingsForService(row.id, serviceId),
    getServiceStatsForCompany(row.id),
  ]);

  const stats = statsMap[serviceId] ?? { bookingCount: 0, revenueCents: 0 };
  const addons = (service.addons ?? []) as ServiceAddon[];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={companyServicesPath(slug)}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to services
      </Link>

      <header className="mt-4 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Service
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{service.name}</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
          <span>{formatRevenue(service.base_price_cents)}</span>
          <span>{formatDuration(service.duration_minutes) ?? "—"}</span>
          {service.category ? <span>{service.category}</span> : null}
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              service.active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {service.active ? "Active" : "Inactive"}
          </span>
        </div>
        {service.description ? (
          <p className="mt-4 max-w-2xl rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {service.description}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="rounded-xl bg-violet-50 px-3 py-1.5 font-medium text-violet-800">
            {stats.bookingCount} booking{stats.bookingCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-xl bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800">
            Revenue: {formatRevenue(stats.revenueCents)}
          </span>
        </div>
      </header>

      {addons.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900">Add-ons</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {addons.map((addon) => (
                  <tr key={addon.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{addon.name}</td>
                    <td className="px-4 py-3">{formatRevenue(addon.price_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-bold text-slate-900">Booking history</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No bookings linked to this service yet.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        href={companyBookingPath(slug, booking.id)}
                        className="text-violet-700 hover:text-violet-900"
                      >
                        {booking.customer_name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {booking.booking_date
                        ? new Date(booking.booking_date).toLocaleString("en-ZA")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {booking.price_cents != null
                        ? formatRevenue(booking.price_cents)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          bookingStatusBadgeClass(booking.status)
                        )}
                      >
                        {booking.status ?? "pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
