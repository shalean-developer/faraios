import { upsertCustomerForCompany } from "@/lib/services/customers";
import { validateBookingAvailability } from "@/lib/bookings/availability";
import { calculateBookingPrice } from "@/lib/bookings/pricing-calculator";
import {
  combineDateAndTime,
  sanitizeCustomResponses,
  validateBookingFormSubmission,
} from "@/lib/bookings/form-validation";
import { logBookingActivity } from "@/lib/services/booking-activities";
import {
  getPricingRuleForService,
  logBookingNotification,
  saveBookingPriceSnapshot,
} from "@/lib/services/booking-form-config";
import { isBookingBuilderSchemaMissing } from "@/lib/supabase/schema-errors";
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
  let serviceBasePriceCents = 0;

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
    serviceBasePriceCents = service.base_price_cents ?? 0;
    priceCents = serviceBasePriceCents;
    durationMinutes = service.duration_minutes ?? null;
  }

  let selectedExtras: { id: string; name: string; price_cents: number }[] = [];
  if (input.extraIds && input.extraIds.length > 0) {
    const extrasRes = await admin.client
      .from("booking_form_extras")
      .select("id, name, price_cents")
      .eq("company_id", input.companyId)
      .in("id", input.extraIds)
      .eq("active", true);
    if (!extrasRes.error || !isBookingBuilderSchemaMissing(extrasRes.error)) {
      selectedExtras = (extrasRes.data ?? []) as typeof selectedExtras;
    }
  }

  const pricingRule = await getPricingRuleForService(input.companyId, serviceId, {
    useAdmin: true,
  });

  const customResponsesRaw = input.customResponses ?? {};
  const pricing = calculateBookingPrice({
    serviceBasePriceCents,
    bedrooms: Number(customResponsesRaw.bedrooms) || 0,
    bathrooms: Number(customResponsesRaw.bathrooms) || 0,
    frequency: String(customResponsesRaw.frequency ?? ""),
    selectedAddons: input.addons,
    selectedExtras: selectedExtras as { id: string; name: string; price_cents: number }[],
    pricingRule,
  });

  if (pricing.requiresCustomQuote) {
    priceCents = null;
  } else if (input.calculatedTotalCents != null && input.calculatedTotalCents > 0) {
    priceCents = input.calculatedTotalCents;
  } else {
    priceCents = pricing.totalCents > 0 ? pricing.totalCents : priceCents;
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

  if (!pricing.requiresCustomQuote) {
    await saveBookingPriceSnapshot({
      companyId: input.companyId,
      bookingId: data.id,
      breakdown: pricing.breakdown,
      subtotalCents: pricing.subtotalCents,
      discountCents: pricing.discountCents,
      serviceFeeCents: pricing.serviceFeeCents,
      vatCents: pricing.vatCents,
      totalCents: pricing.totalCents,
      pricingRulesSnapshot: pricingRule ? { ...pricingRule } : {},
    });
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

  await logBookingNotification({
    companyId: input.companyId,
    bookingId: data.id,
    type: "created",
    channel: "in_app",
    status: "sent",
    payload: { customerName: name, serviceName, source: input.source },
  });

  return { ok: true, bookingId: data.id };
}
