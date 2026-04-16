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
    .order("booking_date", { ascending: false, nullsFirst: false })
    .order("date", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[bookings] listBookingsForCompany", error.message);
    return [];
  }

  return (data ?? []) as Booking[];
}
