import { upsertCustomerForCompany } from "@/lib/services/customers";
import { validateBookingAvailability } from "@/lib/bookings/availability";
import {
  combineDateAndTime,
  sanitizeCustomResponses,
  validateBookingFormSubmission,
} from "@/lib/bookings/form-validation";
import { logBookingActivity } from "@/lib/services/booking-activities";
import { getPublishedBookingFormForCompany } from "@/lib/services/booking-forms";
import { notifyBookingCreated } from "@/lib/services/booking-notifications";
import { triggerWorkflows } from "@/lib/services/workflow-engine";
import { createNotification } from "@/lib/services/notifications";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { PublicBookingInput, ServiceAddon } from "@/types/booking-form";
import type { BookingStatus } from "@/lib/bookings/status";

export type CreateEngineBookingInput = PublicBookingInput & {
  companyId: string;
  source: "internal" | "external" | "marketplace" | "widget" | "public";
  status?: BookingStatus;
  assignedStaffId?: string | null;
  internalNotes?: string;
  skipFormValidation?: boolean;
  skipAvailabilityCheck?: boolean;
};

export type CreateEngineBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

function buildValidationPayload(input: CreateEngineBookingInput): Record<string, unknown> {
  return {
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone,
    service_id: input.serviceId,
    booking_date: input.bookingDate,
    preferred_time: input.preferredTime,
    address: input.address,
    notes: input.notes,
    consent: input.consentGiven ?? false,
    ...input.customResponses,
  };
}

export async function createEngineBooking(
  input: CreateEngineBookingInput
): Promise<CreateEngineBookingResult> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: "Booking engine is not configured." };
  }

  const name = input.customerName.trim();
  if (!name) return { ok: false, error: "Customer name is required." };

  const form = input.skipFormValidation
    ? null
    : await getPublishedBookingFormForCompany(input.companyId);

  if (form && !input.skipFormValidation) {
    const validation = validateBookingFormSubmission(
      form.fields,
      buildValidationPayload(input)
    );
    if (!validation.ok) return validation;
  }

  let serviceName = input.service?.trim() || "General booking";
  const serviceId: string | null = input.serviceId ?? null;
  let priceCents: number | null = null;
  let durationMinutes: number | null = null;

  if (serviceId) {
    const { data: service } = await admin.client
      .from("company_services")
      .select("*")
      .eq("company_id", input.companyId)
      .eq("id", serviceId)
      .maybeSingle();

    if (!service) {
      return { ok: false, error: "Selected service is not available." };
    }
    serviceName = service.name;
    priceCents = service.base_price_cents;
    durationMinutes = service.duration_minutes ?? null;
  }

  const addonTotal = (input.addons ?? []).reduce(
    (sum, addon) => sum + (addon.price_cents ?? 0),
    0
  );
  if (addonTotal > 0) {
    priceCents = (priceCents ?? 0) + addonTotal;
  }

  let bookingDateIso: string;
  try {
    bookingDateIso = combineDateAndTime(input.bookingDate, input.preferredTime);
  } catch {
    return { ok: false, error: "Invalid booking date." };
  }

  if (!input.skipAvailabilityCheck) {
    const { data: companyRow } = await admin.client
      .from("companies")
      .select("booking_hours, blocked_booking_dates")
      .eq("id", input.companyId)
      .maybeSingle();

    const availability = validateBookingAvailability({
      bookingDateIso,
      bookingHours: companyRow?.booking_hours as Record<string, unknown> | null,
      blockedDates: companyRow?.blocked_booking_dates ?? [],
    });
    if (!availability.ok) return availability;
  }

  const customerId = await upsertCustomerForCompany(
    {
      companyId: input.companyId,
      name,
      email: input.customerEmail,
      phone: input.customerPhone,
    },
    admin.client
  );

  const customResponses = form
    ? sanitizeCustomResponses(form.fields, input.customResponses ?? {})
    : input.customResponses ?? {};

  const { data, error } = await admin.client
    .from("bookings")
    .insert({
      company_id: input.companyId,
      customer_name: name,
      customer_email: input.customerEmail?.trim() || null,
      customer_phone: input.customerPhone?.trim() || null,
      service: serviceName,
      booking_date: bookingDateIso,
      status: input.status ?? "pending",
      source: input.source,
      customer_id: customerId,
      service_id: serviceId,
      price_cents: priceCents,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      internal_notes: input.internalNotes?.trim() || null,
      duration_minutes: durationMinutes,
      custom_responses: customResponses,
      addons: (input.addons ?? []) as ServiceAddon[],
      source_website: input.sourceWebsite?.trim() || null,
      referrer: input.referrer?.trim() || null,
      utm_source: input.utmSource?.trim() || null,
      utm_medium: input.utmMedium?.trim() || null,
      utm_campaign: input.utmCampaign?.trim() || null,
      website_id: input.websiteId ?? null,
      device_type: input.deviceType?.trim() || null,
      landing_page: input.landingPage?.trim() || null,
      conversion_page: input.conversionPage?.trim() || null,
      consent_given: input.consentGiven ?? false,
      assigned_staff_id: input.assignedStaffId ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? "Could not create booking." };
  }

  await notifyBookingCreated({
    companyId: input.companyId,
    bookingId: data.id,
    customerName: name,
    customerEmail: input.customerEmail,
    serviceName,
    bookingDate: bookingDateIso,
    customResponses,
    source: input.source,
  });

  await logBookingActivity({
    companyId: input.companyId,
    bookingId: data.id,
    eventType: "created",
    message: `Booking created via ${input.source}.`,
    metadata: { status: input.status ?? "pending", service: serviceName },
  });

  await triggerWorkflows("booking_created", {
    companyId: input.companyId,
    entityType: "booking",
    entityId: data.id,
    payload: {
      customerEmail: input.customerEmail,
      customerName: name,
    },
  });

  await createNotification({
    companyId: input.companyId,
    type: "booking",
    title: "New booking",
    body: `${name} — ${serviceName}`,
    entityType: "booking",
    entityId: data.id,
  });

  return { ok: true, bookingId: data.id };
}
