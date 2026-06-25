"use client";

import { createPublicPageBooking } from "@/app/actions/marketplace-bookings";
import { DynamicPublicBookingForm } from "@/components/booking/dynamic-public-booking-form";
import { SteppedPublicBookingForm } from "@/components/booking/stepped-public-booking-form";
import type {
  BookingFormExtra,
  BookingFormField,
  BookingFormPricingRule,
  BookingFormSettings,
} from "@/types/booking-form";
import type { CompanyService } from "@/types/database";

export function BookPageClient({
  companyId,
  businessName,
  logoUrl,
  brandColor,
  fields,
  services,
  settings,
  extras,
  pricingRule,
  embedded = false,
}: {
  companyId: string;
  businessName: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  fields: BookingFormField[];
  services: CompanyService[];
  settings: BookingFormSettings;
  extras: BookingFormExtra[];
  pricingRule: BookingFormPricingRule | null;
  embedded?: boolean;
}) {
  const onSubmit = async (
    payload: Omit<Parameters<typeof createPublicPageBooking>[0], "companyId">
  ) =>
    createPublicPageBooking({
      companyId,
      ...payload,
      sourceWebsite: typeof window !== "undefined" ? window.location.href : undefined,
    });

  if (settings.multiStep !== false) {
    return (
      <SteppedPublicBookingForm
        businessName={businessName}
        logoUrl={logoUrl}
        brandColor={brandColor}
        fields={fields}
        services={services}
        extras={extras}
        pricingRule={pricingRule}
        settings={settings}
        embedded={embedded}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <DynamicPublicBookingForm
      businessName={businessName}
      fields={fields}
      services={services}
      embedded={embedded}
      formTitle={`Book ${businessName}`}
      successMessage={settings.confirmationMessage}
      onSubmit={onSubmit}
    />
  );
}
