import { notFound } from "next/navigation";

import { ensureBookingFormForCompany } from "@/lib/services/booking-forms";
import { defaultBookingHours } from "@/lib/bookings/availability";
import { getCompanyBySlug } from "@/lib/services/companies";
import type { BookingHours } from "@/types/booking-form";

import { CompanyBookingFormClient } from "./company-booking-form-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Booking form — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyBookingFormPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const industrySlug = row.industries?.slug ?? null;
  const form = await ensureBookingFormForCompany({
    companyId: row.id,
    industrySlug,
  });
  if (!form) notFound();

  return (
    <CompanyBookingFormClient
      slug={slug}
      companyId={row.id}
      industrySlug={industrySlug}
      initialForm={form}
      initialBookingHours={(row.booking_hours as BookingHours | null) ?? defaultBookingHours()}
      initialBlockedDates={row.blocked_booking_dates ?? []}
    />
  );
}
