import { getBookingFormPreset } from "@/lib/industry-modules/loader";
import { defaultBookingHours } from "@/lib/bookings/availability";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { BookingForm, BookingFormField } from "@/types/booking-form";

function mapRow(row: Record<string, unknown>): BookingForm {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    industry_slug: (row.industry_slug as string | null) ?? null,
    name: row.name as string,
    status: row.status as BookingForm["status"],
    fields: (row.fields as BookingFormField[]) ?? [],
    version: (row.version as number) ?? 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function getBookingFormForCompany(
  companyId: string
): Promise<BookingForm | null> {
  if (!isSupabaseConfigured() || !companyId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_forms")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[booking_forms] getBookingFormForCompany", error.message);
    return null;
  }

  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function getPublishedBookingFormForCompany(
  companyId: string
): Promise<BookingForm | null> {
  const admin = tryCreateAdminClient();
  const client = admin.ok ? admin.client : await createClient();

  const { data, error } = await client
    .from("booking_forms")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[booking_forms] getPublishedBookingFormForCompany", error.message);
    return null;
  }

  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function ensureBookingFormForCompany(input: {
  companyId: string;
  industrySlug: string | null;
}): Promise<BookingForm | null> {
  const existing = await getBookingFormForCompany(input.companyId);
  if (existing) return existing;

  const fields = getBookingFormPreset(input.industrySlug);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_forms")
    .insert({
      company_id: input.companyId,
      industry_slug: input.industrySlug,
      name: "Booking form",
      status: "draft",
      fields,
      version: 1,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[booking_forms] ensureBookingFormForCompany", error.message);
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}

/** Create and publish the default industry booking form for a new business. */
export async function seedPublishedBookingFormForCompany(input: {
  companyId: string;
  industrySlug: string | null;
}): Promise<boolean> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return false;

  const fields = getBookingFormPreset(input.industrySlug);
  const { error: formError } = await admin.client.from("booking_forms").upsert(
    {
      company_id: input.companyId,
      industry_slug: input.industrySlug,
      name: "Booking form",
      status: "published",
      fields,
      version: 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (formError) {
    console.error("[booking_forms] seedPublishedBookingFormForCompany", formError.message);
    return false;
  }

  const { error: hoursError } = await admin.client
    .from("companies")
    .update({
      booking_hours: defaultBookingHours(),
      blocked_booking_dates: [],
    })
    .eq("id", input.companyId)
    .is("booking_hours", null);

  if (hoursError) {
    console.error("[booking_forms] seed booking_hours", hoursError.message);
  }

  return true;
}
