"use server";

import { revalidatePath } from "next/cache";

import { getIndustryBookingPreset } from "@/lib/bookings/industry-presets";
import { logBookingActivity } from "@/lib/services/booking-activities";
import { requireCompanyMembership } from "@/lib/services/company-access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { BookingFormField, BookingHours } from "@/types/booking-form";

export type BookingFormActionResult = { ok: true } | { ok: false; error: string };

export async function saveBookingFormDraft(input: {
  companyId: string;
  companySlug: string;
  fields: BookingFormField[];
  name?: string;
}): Promise<BookingFormActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.from("booking_forms").upsert(
    {
      company_id: input.companyId,
      name: input.name?.trim() || "Booking form",
      status: "draft",
      fields: input.fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${input.companySlug}/dashboard/booking-form`);
  return { ok: true };
}

export async function publishBookingForm(input: {
  companyId: string;
  companySlug: string;
  fields: BookingFormField[];
  name?: string;
}): Promise<BookingFormActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("booking_forms")
    .select("version")
    .eq("company_id", input.companyId)
    .maybeSingle();

  const { error } = await supabase.from("booking_forms").upsert(
    {
      company_id: input.companyId,
      name: input.name?.trim() || "Booking form",
      status: "published",
      fields: input.fields,
      version: (existing?.version ?? 0) + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${input.companySlug}/dashboard/booking-form`);
  return { ok: true };
}

export async function resetBookingFormToIndustryPreset(input: {
  companyId: string;
  companySlug: string;
  industrySlug: string | null;
}): Promise<BookingFormActionResult> {
  const fields = getIndustryBookingPreset(input.industrySlug);
  return saveBookingFormDraft({
    companyId: input.companyId,
    companySlug: input.companySlug,
    fields,
    name: "Booking form",
  });
}

export async function saveBookingAvailability(input: {
  companyId: string;
  companySlug: string;
  bookingHours: BookingHours;
  blockedDates: string[];
}): Promise<BookingFormActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      booking_hours: input.bookingHours,
      blocked_booking_dates: input.blockedDates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.companyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${input.companySlug}/dashboard/booking-form`);
  return { ok: true };
}

export async function updateBookingDetails(input: {
  bookingId: string;
  companyId: string;
  companySlug: string;
  assignedStaffId?: string | null;
  internalNotes?: string;
  status?: string;
}): Promise<BookingFormActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bookings")
    .select("assigned_staff_id, internal_notes")
    .eq("id", input.bookingId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  const { error } = await supabase
    .from("bookings")
    .update({
      assigned_staff_id: input.assignedStaffId ?? null,
      internal_notes: input.internalNotes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  const nextStaffId = input.assignedStaffId ?? null;
  if (existing?.assigned_staff_id !== nextStaffId) {
    await logBookingActivity({
      companyId: input.companyId,
      bookingId: input.bookingId,
      eventType: "staff_assigned",
      message: nextStaffId ? "Staff member assigned." : "Staff assignment cleared.",
      metadata: { from: existing?.assigned_staff_id, to: nextStaffId },
    });
  }

  const nextNotes = input.internalNotes?.trim() || null;
  if ((existing?.internal_notes ?? null) !== nextNotes) {
    await logBookingActivity({
      companyId: input.companyId,
      bookingId: input.bookingId,
      eventType: "note_updated",
      message: "Internal notes updated.",
    });
  }

  revalidatePath(`/${input.companySlug}/dashboard/bookings/${input.bookingId}`);
  revalidatePath(`/${input.companySlug}/dashboard/bookings`);
  revalidatePath(`/${input.companySlug}/dashboard/calendar`);
  return { ok: true };
}
