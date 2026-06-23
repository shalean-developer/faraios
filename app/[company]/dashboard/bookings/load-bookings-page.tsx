import { notFound } from "next/navigation";

import { CompanyBookingsClient } from "@/app/[company]/dashboard/bookings/company-bookings-client";
import type { BookingsView } from "@/lib/bookings/request-type";
import { ensureBookingFormForCompany } from "@/lib/services/booking-forms";
import { listBookingsForCompany } from "@/lib/services/bookings";
import { listServicesForCompany } from "@/lib/services/company-services";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listCustomersForCompany } from "@/lib/services/customers";
import { listQuotesForCompany } from "@/lib/services/quotes";

export async function renderCompanyBookingsPage(
  companySlug: string,
  view: BookingsView = "all"
) {
  const slug = decodeURIComponent(companySlug);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const industrySlug = row.industries?.slug ?? null;

  const [bookings, services, quotes, customers, bookingForm] = await Promise.all([
    listBookingsForCompany(row.id),
    listServicesForCompany(row.id, { activeOnly: true }),
    listQuotesForCompany(row.id),
    listCustomersForCompany(row.id),
    view === "booking-requests"
      ? ensureBookingFormForCompany({ companyId: row.id, industrySlug })
      : Promise.resolve(null),
  ]);

  return (
    <CompanyBookingsClient
      slug={slug}
      company={row}
      bookings={bookings}
      services={services}
      quotes={quotes}
      customers={customers}
      bookingForm={bookingForm}
      view={view}
    />
  );
}