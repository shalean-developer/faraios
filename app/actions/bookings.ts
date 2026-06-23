"use server";

import { revalidatePath } from "next/cache";

import { createEngineBooking } from "@/lib/services/booking-engine";
import { requireCompanyMembership } from "@/lib/services/company-access";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type CreateBookingInput = {
  companyId: string;
  companySlug: string;
  customerName: string;
  service: string;
  bookingDate: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceId?: string;
  preferredTime?: string;
  address?: string;
  notes?: string;
  customResponses?: Record<string, unknown>;
};

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

export async function createBookingForCompany(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    };
  }

  if (!input.companyId) return { ok: false, error: "Missing company." };

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await createEngineBooking({
    companyId: input.companyId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    serviceId: input.serviceId,
    service: input.service,
    bookingDate: input.bookingDate,
    preferredTime: input.preferredTime,
    address: input.address,
    notes: input.notes,
    customResponses: input.customResponses,
    source: "internal",
    skipFormValidation: true,
    skipAvailabilityCheck: true,
  });

  if (!result.ok) return result;

  revalidatePath(`/${input.companySlug}/dashboard`);
  revalidatePath(`/${input.companySlug}/dashboard/bookings`);
  revalidatePath(`/${input.companySlug}/dashboard/customers`);
  revalidatePath("/app");
  return result;
}
