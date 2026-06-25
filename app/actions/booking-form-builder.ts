"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyPermission } from "@/lib/services/company-access";
import {
  saveBookingFormSettings,
  savePricingRule,
  upsertBookingFormExtras,
  upsertBookingFormServiceAreas,
} from "@/lib/services/booking-form-config";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type {
  BookingFormExtra,
  BookingFormPricingRule,
  BookingFormServiceArea,
  BookingFormSettings,
} from "@/types/booking-form";

import type { BookingFormActionResult } from "./booking-form";

export async function saveBookingFormSettingsAction(input: {
  companyId: string;
  companySlug: string;
  settings: BookingFormSettings;
}): Promise<BookingFormActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyPermission(input.companyId, "edit_bookings");
  if (!access.ok) return access;

  const result = await saveBookingFormSettings({
    companyId: input.companyId,
    settings: input.settings,
  });

  if (!result.ok) return result;
  revalidatePath(`/${input.companySlug}/dashboard/booking-form`);
  return { ok: true };
}

export async function saveBookingPricingRuleAction(input: {
  companyId: string;
  companySlug: string;
  rule: Omit<BookingFormPricingRule, "company_id"> & { company_id?: string };
}): Promise<BookingFormActionResult & { id?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyPermission(input.companyId, "edit_bookings");
  if (!access.ok) return access;

  const result = await savePricingRule({
    ...input.rule,
    company_id: input.companyId,
  });

  if (!result.ok) return result;
  revalidatePath(`/${input.companySlug}/dashboard/booking-form`);
  return { ok: true, id: result.id };
}

export async function saveBookingFormExtrasAction(input: {
  companyId: string;
  companySlug: string;
  extras: BookingFormExtra[];
}): Promise<BookingFormActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyPermission(input.companyId, "edit_bookings");
  if (!access.ok) return access;

  const result = await upsertBookingFormExtras(input.companyId, input.extras);
  if (!result.ok) return result;

  revalidatePath(`/${input.companySlug}/dashboard/booking-form`);
  return { ok: true };
}

export async function saveBookingFormServiceAreasAction(input: {
  companyId: string;
  companySlug: string;
  areas: BookingFormServiceArea[];
}): Promise<BookingFormActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyPermission(input.companyId, "edit_bookings");
  if (!access.ok) return access;

  const result = await upsertBookingFormServiceAreas(input.companyId, input.areas);
  if (!result.ok) return result;

  revalidatePath(`/${input.companySlug}/dashboard/booking-form`);
  return { ok: true };
}

export async function unpublishBookingForm(input: {
  companyId: string;
  companySlug: string;
}): Promise<BookingFormActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyPermission(input.companyId, "edit_bookings");
  if (!access.ok) return access;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_forms")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${input.companySlug}/dashboard/booking-form`);
  return { ok: true };
}
