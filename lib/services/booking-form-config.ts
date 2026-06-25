import { defaultCleaningTemplates } from "@/lib/bookings/cleaning-templates";
import { defaultPricingRule } from "@/lib/bookings/pricing-calculator";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { isBookingBuilderSchemaMissing } from "@/lib/supabase/schema-errors";
import type {
  BookingFormExtra,
  BookingFormPricingRule,
  BookingFormServiceArea,
  BookingFormSettings,
  PriceBreakdownLine,
} from "@/types/booking-form";

export type BookingFormConfig = {
  settings: BookingFormSettings;
  pricingRule: BookingFormPricingRule | null;
  extras: BookingFormExtra[];
  serviceAreas: BookingFormServiceArea[];
};

function mapPricingRule(row: Record<string, unknown>): BookingFormPricingRule {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    service_id: (row.service_id as string | null) ?? null,
    base_price_cents: (row.base_price_cents as number) ?? 0,
    price_per_bedroom_cents: (row.price_per_bedroom_cents as number) ?? 0,
    price_per_bathroom_cents: (row.price_per_bathroom_cents as number) ?? 0,
    service_fee_cents: (row.service_fee_cents as number) ?? 0,
    minimum_price_cents: (row.minimum_price_cents as number) ?? 0,
    maximum_price_cents: (row.maximum_price_cents as number | null) ?? null,
    frequency_discounts: (row.frequency_discounts as Record<string, number>) ?? {},
    vat_rate_percent: Number(row.vat_rate_percent ?? 0),
    custom_quote_enabled: Boolean(row.custom_quote_enabled),
    active: Boolean(row.active ?? true),
  };
}

function mapExtra(row: Record<string, unknown>): BookingFormExtra {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    price_cents: (row.price_cents as number) ?? 0,
    active: Boolean(row.active ?? true),
    sort_order: (row.sort_order as number) ?? 0,
  };
}

function mapServiceArea(row: Record<string, unknown>): BookingFormServiceArea {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: row.name as string,
    active: Boolean(row.active ?? true),
    sort_order: (row.sort_order as number) ?? 0,
  };
}

export function defaultBookingFormSettings(industrySlug: string | null): BookingFormSettings {
  const settings: BookingFormSettings = {
    multiStep: true,
    paymentRequired: false,
    confirmationMessage:
      "Thank you! Your booking request has been received. We will confirm your appointment shortly.",
    branding: { useCompanyBranding: true },
    showVatLine: true,
  };

  if (industrySlug === "cleaning") {
    settings.templates = defaultCleaningTemplates();
  }

  return settings;
}

export async function getBookingFormConfigForCompany(
  companyId: string,
  options?: { useAdmin?: boolean }
): Promise<BookingFormConfig> {
  const empty: BookingFormConfig = {
    settings: {},
    pricingRule: null,
    extras: [],
    serviceAreas: [],
  };

  if (!isSupabaseConfigured() || !companyId) return empty;

  let client;
  if (options?.useAdmin) {
    const admin = tryCreateAdminClient();
    if (!admin.ok) return empty;
    client = admin.client;
  } else {
    client = await createClient();
  }

  const [formRes, pricingRes, extrasRes, areasRes] = await Promise.all([
    client.from("booking_forms").select("settings, industry_slug").eq("company_id", companyId).maybeSingle(),
    client
      .from("booking_form_pricing_rules")
      .select("*")
      .eq("company_id", companyId)
      .is("service_id", null)
      .eq("active", true)
      .maybeSingle(),
    client
      .from("booking_form_extras")
      .select("*")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: true }),
    client
      .from("booking_form_service_areas")
      .select("*")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: true }),
  ]);

  const schemaMissing = [pricingRes.error, extrasRes.error, areasRes.error].some(
    isBookingBuilderSchemaMissing
  );
  if (schemaMissing) {
    console.warn(
      "[booking-form-config] Booking form builder tables are missing. Run supabase/migrations/20260705000000_v11_booking_form_builder.sql"
    );
  }

  let industrySlug: string | null = null;
  let storedSettings: BookingFormSettings | null = null;

  if (formRes.error && isBookingBuilderSchemaMissing(formRes.error)) {
    const fallback = await client
      .from("booking_forms")
      .select("industry_slug")
      .eq("company_id", companyId)
      .maybeSingle();
    industrySlug = (fallback.data?.industry_slug as string | null) ?? null;
  } else if (formRes.data) {
    industrySlug = (formRes.data.industry_slug as string | null) ?? null;
    storedSettings = (formRes.data.settings as BookingFormSettings | null) ?? null;
  }

  const settings = storedSettings ?? defaultBookingFormSettings(industrySlug);

  return {
    settings,
    pricingRule:
      pricingRes.error || !pricingRes.data
        ? null
        : mapPricingRule(pricingRes.data as Record<string, unknown>),
    extras: extrasRes.error
      ? []
      : (extrasRes.data ?? []).map((r) => mapExtra(r as Record<string, unknown>)),
    serviceAreas: areasRes.error
      ? []
      : (areasRes.data ?? []).map((r) => mapServiceArea(r as Record<string, unknown>)),
  };
}

export async function getPricingRuleForService(
  companyId: string,
  serviceId: string | null,
  options?: { useAdmin?: boolean }
): Promise<BookingFormPricingRule | null> {
  if (!isSupabaseConfigured() || !companyId) return null;

  let client;
  if (options?.useAdmin) {
    const admin = tryCreateAdminClient();
    if (!admin.ok) return null;
    client = admin.client;
  } else {
    client = await createClient();
  }

  if (serviceId) {
    const { data: serviceRule, error } = await client
      .from("booking_form_pricing_rules")
      .select("*")
      .eq("company_id", companyId)
      .eq("service_id", serviceId)
      .eq("active", true)
      .maybeSingle();

    if (error && isBookingBuilderSchemaMissing(error)) return null;
    if (serviceRule) return mapPricingRule(serviceRule as Record<string, unknown>);
  }

  const { data: globalRule, error: globalError } = await client
    .from("booking_form_pricing_rules")
    .select("*")
    .eq("company_id", companyId)
    .is("service_id", null)
    .eq("active", true)
    .maybeSingle();

  if (globalError && isBookingBuilderSchemaMissing(globalError)) return null;

  return globalRule ? mapPricingRule(globalRule as Record<string, unknown>) : null;
}

export async function ensureDefaultPricingRule(companyId: string): Promise<BookingFormPricingRule | null> {
  const existing = await getPricingRuleForService(companyId, null);
  if (existing) return existing;

  const supabase = await createClient();
  const defaults = defaultPricingRule(companyId);
  const { data, error } = await supabase
    .from("booking_form_pricing_rules")
    .insert(defaults)
    .select("*")
    .single();

  if (error) {
    if (isBookingBuilderSchemaMissing(error)) {
      console.warn("[booking-form-config] ensureDefaultPricingRule skipped — migration not applied");
      return null;
    }
    console.error("[booking-form-config] ensureDefaultPricingRule", error.message);
    return null;
  }

  return mapPricingRule(data as Record<string, unknown>);
}

export async function saveBookingFormSettings(input: {
  companyId: string;
  settings: BookingFormSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_forms")
    .update({
      settings: input.settings,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function savePricingRule(
  rule: Omit<BookingFormPricingRule, "id"> & { id?: string }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const payload = {
    company_id: rule.company_id,
    service_id: rule.service_id,
    base_price_cents: rule.base_price_cents,
    price_per_bedroom_cents: rule.price_per_bedroom_cents,
    price_per_bathroom_cents: rule.price_per_bathroom_cents,
    service_fee_cents: rule.service_fee_cents,
    minimum_price_cents: rule.minimum_price_cents,
    maximum_price_cents: rule.maximum_price_cents,
    frequency_discounts: rule.frequency_discounts,
    vat_rate_percent: rule.vat_rate_percent,
    custom_quote_enabled: rule.custom_quote_enabled,
    active: rule.active,
    updated_at: new Date().toISOString(),
  };

  if (rule.id) {
    const { error } = await supabase
      .from("booking_form_pricing_rules")
      .update(payload)
      .eq("id", rule.id)
      .eq("company_id", rule.company_id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: rule.id };
  }

  const { data, error } = await supabase
    .from("booking_form_pricing_rules")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) return { ok: false, error: error?.message ?? "Could not save pricing." };
  return { ok: true, id: data.id as string };
}

export async function upsertBookingFormExtras(
  companyId: string,
  extras: Omit<BookingFormExtra, "company_id">[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("booking_form_extras")
    .select("id")
    .eq("company_id", companyId);

  const keepIds = new Set(extras.filter((e) => e.id && !e.id.startsWith("new_")).map((e) => e.id));
  const toDelete = (existing ?? []).filter((r) => !keepIds.has(r.id as string));

  for (const row of toDelete) {
    await supabase.from("booking_form_extras").delete().eq("id", row.id).eq("company_id", companyId);
  }

  for (const [index, extra] of extras.entries()) {
    const payload = {
      company_id: companyId,
      name: extra.name.trim(),
      description: extra.description?.trim() || null,
      price_cents: extra.price_cents,
      active: extra.active,
      sort_order: index,
      updated_at: new Date().toISOString(),
    };

    if (extra.id && !extra.id.startsWith("new_")) {
      const { error } = await supabase
        .from("booking_form_extras")
        .update(payload)
        .eq("id", extra.id)
        .eq("company_id", companyId);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("booking_form_extras").insert(payload);
      if (error) return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

export async function upsertBookingFormServiceAreas(
  companyId: string,
  areas: Omit<BookingFormServiceArea, "company_id">[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("booking_form_service_areas")
    .select("id")
    .eq("company_id", companyId);

  const keepIds = new Set(areas.filter((a) => a.id && !a.id.startsWith("new_")).map((a) => a.id));
  const toDelete = (existing ?? []).filter((r) => !keepIds.has(r.id as string));

  for (const row of toDelete) {
    await supabase
      .from("booking_form_service_areas")
      .delete()
      .eq("id", row.id)
      .eq("company_id", companyId);
  }

  for (const [index, area] of areas.entries()) {
    const payload = {
      company_id: companyId,
      name: area.name.trim(),
      active: area.active,
      sort_order: index,
      updated_at: new Date().toISOString(),
    };

    if (area.id && !area.id.startsWith("new_")) {
      const { error } = await supabase
        .from("booking_form_service_areas")
        .update(payload)
        .eq("id", area.id)
        .eq("company_id", companyId);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("booking_form_service_areas").insert(payload);
      if (error) return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

export async function saveBookingPriceSnapshot(input: {
  companyId: string;
  bookingId: string;
  breakdown: PriceBreakdownLine[];
  subtotalCents: number;
  discountCents: number;
  serviceFeeCents: number;
  vatCents: number;
  totalCents: number;
  pricingRulesSnapshot: Record<string, unknown>;
}): Promise<string | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data, error } = await admin.client
    .from("booking_price_snapshots")
    .insert({
      company_id: input.companyId,
      booking_id: input.bookingId,
      breakdown: input.breakdown,
      subtotal_cents: input.subtotalCents,
      discount_cents: input.discountCents,
      service_fee_cents: input.serviceFeeCents,
      vat_cents: input.vatCents,
      total_cents: input.totalCents,
      pricing_rules_snapshot: input.pricingRulesSnapshot,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    if (isBookingBuilderSchemaMissing(error)) return null;
    console.error("[booking-form-config] saveBookingPriceSnapshot", error?.message);
    return null;
  }

  await admin.client
    .from("bookings")
    .update({ pricing_snapshot_id: data.id })
    .eq("id", input.bookingId);

  return data.id as string;
}

export async function logBookingNotification(input: {
  companyId: string;
  bookingId: string;
  type: string;
  channel?: string;
  status?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  await admin.client.from("booking_notifications").insert({
    company_id: input.companyId,
    booking_id: input.bookingId,
    type: input.type,
    channel: input.channel ?? "email",
    status: input.status ?? "sent",
    payload: input.payload ?? {},
  });
}
