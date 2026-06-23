"use client";

import { createPublicPageBooking } from "@/app/actions/marketplace-bookings";
import { DynamicPublicBookingForm } from "@/components/booking/dynamic-public-booking-form";
import type { BookingFormField } from "@/types/booking-form";
import type { CompanyService } from "@/types/database";

export function BookPageClient({
  companyId,
  businessName,
  fields,
  services,
}: {
  companyId: string;
  businessName: string;
  fields: BookingFormField[];
  services: CompanyService[];
}) {
  return (
    <DynamicPublicBookingForm
      businessName={businessName}
      fields={fields}
      services={services}
      onSubmit={async (payload) =>
        createPublicPageBooking({
          companyId,
          ...payload,
          sourceWebsite: typeof window !== "undefined" ? window.location.href : undefined,
        })
      }
    />
  );
}
