import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { Booking } from "@/types/database";

export async function listBookingsForCompany(
  companyId: string
): Promise<Booking[]> {
  if (!isSupabaseConfigured() || !companyId) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("company_id", companyId)
    .order("booking_date", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[bookings] listBookingsForCompany", error.message);
    return [];
  }

  return (data ?? []) as Booking[];
}

export async function listBookingsForCustomer(
  companyId: string,
  customerId: string
): Promise<Booking[]> {
  if (!isSupabaseConfigured() || !companyId || !customerId) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("booking_date", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[bookings] listBookingsForCustomer", error.message);
    return [];
  }

  return (data ?? []) as Booking[];
}

export async function getBookingById(
  companyId: string,
  bookingId: string
): Promise<Booking | null> {
  if (!isSupabaseConfigured() || !companyId || !bookingId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("[bookings] getBookingById", error.message);
    return null;
  }

  return data as Booking | null;
}
