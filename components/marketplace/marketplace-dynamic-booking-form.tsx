"use client";

import { createPublicMarketplaceBooking } from "@/app/actions/marketplace-bookings";
import { DynamicPublicBookingForm } from "@/components/booking/dynamic-public-booking-form";
import type { BookingFormField } from "@/types/booking-form";
import type { CompanyService } from "@/types/database";
import type { MarketplaceListing } from "@/types/marketplace";

type Props = {
  listing: MarketplaceListing;
  fields: BookingFormField[];
  services: CompanyService[];
};

export function MarketplaceDynamicBookingForm({ listing, fields, services }: Props) {
  return (
    <DynamicPublicBookingForm
      businessName={listing.name}
      fields={fields}
      services={services}
      onSubmit={async (payload) => {
        return createPublicMarketplaceBooking({
          companyId: listing.companyId,
          companySlug: listing.slug,
          customerName: payload.customerName,
          customerEmail: payload.customerEmail ?? "",
          customerPhone: payload.customerPhone ?? "",
          serviceId: payload.serviceId,
          service: payload.service ?? "",
          bookingDate: payload.bookingDate,
          preferredTime: payload.preferredTime,
          address: payload.address,
          notes: payload.notes,
          customResponses: payload.customResponses,
          consentGiven: payload.consentGiven,
        });
      }}
    />
  );
}
