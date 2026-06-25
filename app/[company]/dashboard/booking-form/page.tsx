import { notFound } from "next/navigation";

import {
  ensureDefaultPricingRule,
  getBookingFormConfigForCompany,
} from "@/lib/services/booking-form-config";
import { ensureBookingFormForCompany } from "@/lib/services/booking-forms";
import { defaultBookingHours } from "@/lib/bookings/availability";
import { listServicesForCompany } from "@/lib/services/company-services";
import { listBookingsForCompany } from "@/lib/services/bookings";
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
  const [form, services, config, recentBookings] = await Promise.all([
    ensureBookingFormForCompany({
      companyId: row.id,
      industrySlug,
    }),
    listServicesForCompany(row.id),
    getBookingFormConfigForCompany(row.id),
    listBookingsForCompany(row.id),
  ]);
  if (!form) notFound();

  const pricingRule = config.pricingRule ?? (await ensureDefaultPricingRule(row.id));

  return (
    <CompanyBookingFormClient
      slug={slug}
      company={row}
      industrySlug={industrySlug}
      initialForm={form}
      initialBookingHours={(row.booking_hours as BookingHours | null) ?? defaultBookingHours()}
      initialBlockedDates={row.blocked_booking_dates ?? []}
      services={services}
      initialPricingRule={pricingRule}
      initialExtras={config.extras}
      initialServiceAreas={config.serviceAreas}
      recentBookings={recentBookings.slice(0, 10)}
    />
  );
}
