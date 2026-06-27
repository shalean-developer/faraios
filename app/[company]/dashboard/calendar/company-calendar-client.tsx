"use client";

import { RiseEventCalendar } from "@/components/company/rise-event-calendar";
import type { BookingForm, BookingHours } from "@/types/booking-form";
import type { Booking, CompanyService, CompanyWithIndustry } from "@/types/database";
import type { CompanyMember } from "@/lib/services/team";

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
  return (
    <RiseEventCalendar
      slug={slug}
      company={company}
      bookings={bookings}
      services={services}
      staff={staff}
      bookingForm={bookingForm}
      bookingHours={bookingHours}
      blockedDates={blockedDates}
    />
  );
}
