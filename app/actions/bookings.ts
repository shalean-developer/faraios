"use server";

import { revalidatePath } from "next/cache";
import { buildBookingPayload } from "@/lib/bookings/validation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type CreateBookingInput = {
  companyId: string;
  companySlug: string;
  customerName: string;
  service: string;
  bookingDate: string;
};

export type CreateBookingResult = { ok: true } | { ok: false; error: string };

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

  const parsed = buildBookingPayload({
    customerName: input.customerName,
    service: input.service,
    bookingDate: input.bookingDate,
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: membership, error: memberError } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !membership) {
    return { ok: false, error: "You do not have access to this company." };
  }

  const { error } = await supabase.from("bookings").insert({
    company_id: input.companyId,
    customer_name: parsed.data.customerName,
    service: parsed.data.service,
    booking_date: parsed.data.bookingDateIso,
    date: parsed.data.bookingDateIso,
    status: "pending",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/${input.companySlug}/dashboard`);
  revalidatePath("/app");
  return { ok: true };
}
