"use server";

import { revalidatePath } from "next/cache";

import { buildBookingPayload } from "@/lib/bookings/validation";
import { getMarketplaceBusinessBySlug } from "@/lib/services/marketplace";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";
import type { PublicBookingInput } from "@/types/marketplace";

export type PublicBookingResult = { ok: true } | { ok: false; error: string };

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

  const parsed = buildBookingPayload({
    customerName: input.customerName,
    service: input.service,
    bookingDate: input.bookingDate,
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const customerEmail = input.customerEmail.trim();
  const customerPhone = input.customerPhone.trim();
  if (!customerEmail || !customerEmail.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bookings").insert({
    company_id: input.companyId,
    customer_name: parsed.data.customerName,
    service: parsed.data.service,
    booking_date: parsed.data.bookingDateIso,
    date: parsed.data.bookingDateIso,
    status: "pending",
    customer_email: customerEmail,
    customer_phone: customerPhone || null,
    source: "marketplace",
  });

  if (error) {
    console.error("[marketplace] createPublicMarketplaceBooking", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${input.companySlug}`);
  revalidatePath(`/${input.companySlug}/dashboard`);
  return { ok: true };
}
