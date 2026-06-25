"use server";

import { revalidatePath } from "next/cache";

import { createEngineBooking } from "@/lib/services/booking-engine";
import { getMarketplaceBusinessBySlug } from "@/lib/services/marketplace";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { PublicBookingInput } from "@/types/marketplace";

export type PublicBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

export async function createPublicMarketplaceBooking(
  input: PublicBookingInput
): Promise<PublicBookingResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Bookings are not configured yet." };
  }

  const listing = await getMarketplaceBusinessBySlug(input.companySlug);
  if (!listing || listing.companyId !== input.companyId) {
    return { ok: false, error: "This business is not available for booking." };
  }

  const customerEmail = input.customerEmail?.trim() ?? "";
  if (!customerEmail || !customerEmail.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }

  const result = await createEngineBooking({
    companyId: input.companyId,
    customerName: input.customerName,
    customerEmail,
    customerPhone: input.customerPhone?.trim() || undefined,
    serviceId: input.serviceId,
    service: input.service,
    bookingDate: input.bookingDate,
    preferredTime: input.preferredTime,
    address: input.address,
    notes: input.notes,
    customResponses: input.customResponses,
    consentGiven: input.consentGiven ?? true,
    source: "marketplace",
    sourceWebsite: `/marketplace/${input.companySlug}`,
  });

  if (!result.ok) return result;

  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${input.companySlug}`);
  revalidatePath(`/${input.companySlug}/dashboard`);
  revalidatePath(`/${input.companySlug}/dashboard/bookings`);
  revalidatePath(`/${input.companySlug}/dashboard/customers`);
  return result;
}

export async function createPublicPageBooking(input: {
  companyId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceId?: string;
  service?: string;
  bookingDate: string;
  preferredTime?: string;
  address?: string;
  notes?: string;
  customResponses?: Record<string, unknown>;
  consentGiven?: boolean;
  sourceWebsite?: string;
  addons?: import("@/types/booking-form").ServiceAddon[];
  extraIds?: string[];
  calculatedTotalCents?: number;
}): Promise<PublicBookingResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Bookings are not configured yet." };
  }

  return createEngineBooking({
    ...input,
    source: "public",
    sourceWebsite: input.sourceWebsite ?? `/book/${input.companyId}`,
  });
}
