import { notFound } from "next/navigation";

import { ensureBookingFormForCompany } from "@/lib/services/booking-forms";
import { listBookingsForCompany } from "@/lib/services/bookings";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listServicesForCompany } from "@/lib/services/company-services";
import { listCompanyMembers } from "@/lib/services/team";
import type { BookingHours } from "@/types/booking-form";

import { CompanyCalendarClient } from "./company-calendar-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar — Shalean",
  robots: { index: false, follow: false },
};

export default async function CompanyCalendarPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const industrySlug = row.industries?.slug ?? null;

  const [bookings, services, staff, bookingForm] = await Promise.all([
    listBookingsForCompany(row.id),
    listServicesForCompany(row.id, { activeOnly: true }),
    listCompanyMembers(row.id),
    ensureBookingFormForCompany({ companyId: row.id, industrySlug }),
  ]);

  return (
    <CompanyCalendarClient
      slug={slug}
      company={row}
      bookings={bookings}
      services={services}
      staff={staff}
      bookingForm={bookingForm}
      bookingHours={(row.booking_hours as BookingHours | null) ?? null}
      blockedDates={row.blocked_booking_dates ?? []}
    />
  );
}
