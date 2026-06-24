"use server";

import { revalidatePath } from "next/cache";

import type { CompanyNotificationPreferences } from "@/lib/services/company-notification-preferences";
import { upsertLocalSeoSettings } from "@/lib/services/local-seo";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { isBookingStatus, type BookingStatus } from "@/lib/bookings/status";
import { logBookingActivity } from "@/lib/services/booking-activities";
import { requireCompanyPermission } from "@/lib/services/company-access";
import { notifyBookingStatusChanged } from "@/lib/services/booking-notifications";
import { maybeAutoSendReviewRequest } from "@/lib/services/review-requests";
import { triggerWorkflows } from "@/lib/services/workflow-engine";
import { createNotification } from "@/lib/services/notifications";

export type UpdateCompanySettingsInput = {
  companyId: string;
  companySlug: string;
  name: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  contactPhone?: string;
  contactLocation?: string;
  serviceAreas?: string;
  businessDescription?: string;
  brandLogoUrl?: string;
  brandPrimaryColor?: string;
  brandAccentColor?: string;
  notificationPreferences?: CompanyNotificationPreferences;
};

export type CompanySettingsResult = { ok: true } | { ok: false; error: string };

export async function updateCompanySettings(
  input: UpdateCompanySettingsInput
): Promise<CompanySettingsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Business name is required." };

  const access = await requireCompanyPermission(input.companyId, "manage_settings");
  if (!access.ok) return access;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client
    .from("companies")
    .update({
      name,
      primary_contact_name: input.primaryContactName?.trim() || null,
      primary_contact_email: input.primaryContactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      contact_location: input.contactLocation?.trim() || null,
      service_areas: input.serviceAreas?.trim() || null,
      business_description: input.businessDescription?.trim() || null,
      ...(input.brandLogoUrl !== undefined
        ? { brand_logo_url: input.brandLogoUrl.trim() || null }
        : {}),
      ...(input.brandPrimaryColor !== undefined
        ? { brand_primary_color: input.brandPrimaryColor.trim() || null }
        : {}),
      ...(input.brandAccentColor !== undefined
        ? { brand_accent_color: input.brandAccentColor.trim() || null }
        : {}),
      ...(input.notificationPreferences !== undefined
        ? { notification_preferences: input.notificationPreferences }
        : {}),
    })
    .eq("id", input.companyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const serviceAreas = input.serviceAreas?.trim()
    ? input.serviceAreas.split(/[,;]/).map((a) => a.trim()).filter(Boolean)
    : [];

  await upsertLocalSeoSettings(input.companyId, {
    business_name: name,
    phone: input.contactPhone?.trim() || null,
    email: input.primaryContactEmail?.trim() || null,
    primary_location: input.contactLocation?.trim() || null,
    service_areas: serviceAreas,
    main_service: input.businessDescription?.trim()?.slice(0, 120) || null,
  });

  revalidatePath(`/${input.companySlug}/dashboard/settings`);
  revalidatePath(`/${input.companySlug}/dashboard/seo`);
  return { ok: true };
}

export type ConnectExternalWebsiteInput = {
  companyId: string;
  companySlug: string;
  productionUrl: string;
};

export async function connectExternalWebsite(
  input: ConnectExternalWebsiteInput
): Promise<CompanySettingsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const url = input.productionUrl.trim();
  if (!url) return { ok: false, error: "Website URL is required." };

  let normalized = url;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    new URL(normalized);
  } catch {
    return { ok: false, error: "Enter a valid website URL." };
  }

  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: admin.error };

  const { error } = await admin.client.from("connected_websites").upsert(
    {
      company_id: input.companyId,
      type: "external",
      production_url: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/${input.companySlug}/dashboard/settings`);
  revalidatePath(`/${input.companySlug}/dashboard/websites/connection`);
  revalidatePath(`/${input.companySlug}/dashboard/websites`);
  return { ok: true };
}

export async function updateBookingStatus(input: {
  bookingId: string;
  companyId: string;
  companySlug: string;
  status: BookingStatus;
}): Promise<CompanySettingsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  if (!isBookingStatus(input.status)) {
    return { ok: false, error: "Invalid booking status." };
  }

  const access = await requireCompanyPermission(input.companyId, "edit_bookings");
  if (!access.ok) return access;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bookings")
    .select("customer_email, customer_name, service, status")
    .eq("id", input.bookingId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  const { error } = await supabase
    .from("bookings")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("id", input.bookingId)
    .eq("company_id", input.companyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (existing?.status !== input.status) {
    await logBookingActivity({
      companyId: input.companyId,
      bookingId: input.bookingId,
      eventType: "status_changed",
      message: `Status changed to ${input.status.replace(/_/g, " ")}.`,
      metadata: { from: existing?.status, to: input.status },
    });
  }

  await notifyBookingStatusChanged({
    companyId: input.companyId,
    bookingId: input.bookingId,
    status: input.status,
    customerEmail: existing?.customer_email,
    customerName: existing?.customer_name,
    serviceName: existing?.service,
  });

  if (input.status === "completed" && existing?.status !== "completed") {
    const { data: companyRow } = await supabase
      .from("companies")
      .select("name")
      .eq("id", input.companyId)
      .maybeSingle();

    await maybeAutoSendReviewRequest({
      companyId: input.companyId,
      bookingId: input.bookingId,
      customerEmail: existing?.customer_email,
      customerName: existing?.customer_name,
      businessName: companyRow?.name ?? "our business",
    });

    await triggerWorkflows("booking_completed", {
      companyId: input.companyId,
      entityType: "booking",
      entityId: input.bookingId,
      payload: {
        customerEmail: existing?.customer_email,
        customerName: existing?.customer_name,
      },
    });
  }

  const triggerMap: Record<string, "booking_confirmed" | "booking_cancelled" | undefined> = {
    confirmed: "booking_confirmed",
    cancelled: "booking_cancelled",
  };
  const wfTrigger = triggerMap[input.status];
  if (wfTrigger && existing?.status !== input.status) {
    await triggerWorkflows(wfTrigger, {
      companyId: input.companyId,
      entityType: "booking",
      entityId: input.bookingId,
      payload: {
        customerEmail: existing?.customer_email,
        customerName: existing?.customer_name,
      },
    });
  }

  await createNotification({
    companyId: input.companyId,
    type: "booking",
    title: `Booking ${input.status.replace(/_/g, " ")}`,
    body: `${existing?.service ?? "Booking"} — ${existing?.customer_name ?? "Customer"}`,
    entityType: "booking",
    entityId: input.bookingId,
  });

  revalidatePath(`/${input.companySlug}/dashboard`);
  revalidatePath(`/${input.companySlug}/dashboard/bookings`);
  revalidatePath(`/${input.companySlug}/dashboard/bookings/${input.bookingId}`);
  revalidatePath(`/${input.companySlug}/dashboard/calendar`);
  return { ok: true };
}
