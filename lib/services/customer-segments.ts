import { DEFAULT_CUSTOMER_SEGMENTS } from "@/lib/customers/segment-definitions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { CustomerSegment } from "@/types/v6-engine";

export type SegmentCustomer = {
  id: string;
  name: string;
  email: string | null;
};

function isMissingSegmentsTable(message: string | undefined): boolean {
  if (!message) return false;
  return message.includes("customer_segments") && message.includes("does not exist");
}

async function enrichSegments(
  companyId: string,
  rows: Array<{
    id: string;
    segment_type: string;
    name: string;
    criteria: unknown;
  }>
): Promise<CustomerSegment[]> {
  const result: CustomerSegment[] = [];

  for (const seg of rows) {
    const segmentType = seg.segment_type as CustomerSegment["segmentType"];
    const criteria = (seg.criteria as Record<string, unknown>) ?? {};
    const count = await countSegmentCustomers(companyId, segmentType, criteria);
    const definition = DEFAULT_CUSTOMER_SEGMENTS.find(
      (item) => item.segmentType === segmentType
    );

    result.push({
      id: seg.id,
      companyId,
      name: seg.name,
      segmentType,
      criteria,
      customerCount: count,
      description: definition?.description,
    });
  }

  return result;
}

async function buildVirtualSegments(companyId: string): Promise<CustomerSegment[]> {
  const result: CustomerSegment[] = [];

  for (const definition of DEFAULT_CUSTOMER_SEGMENTS) {
    const count = await countSegmentCustomers(
      companyId,
      definition.segmentType,
      definition.criteria
    );

    result.push({
      id: definition.segmentType,
      companyId,
      name: definition.name,
      segmentType: definition.segmentType,
      criteria: definition.criteria,
      customerCount: count,
      description: definition.description,
    });
  }

  return result;
}

export async function listCustomerSegments(companyId: string): Promise<CustomerSegment[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const supabase = await createClient();
  const { data: segments, error } = await supabase
    .from("customer_segments")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingSegmentsTable(error.message)) {
      console.warn("[segments] customer_segments table missing; using computed segments.");
    } else {
      console.error("[segments] listCustomerSegments", error.message);
    }
    return buildVirtualSegments(companyId);
  }

  if (!segments?.length) {
    return buildVirtualSegments(companyId);
  }

  return enrichSegments(companyId, segments);
}

async function countSegmentCustomers(
  companyId: string,
  segmentType: string,
  criteria: unknown
): Promise<number> {
  const customers = await getSegmentCustomers(companyId, segmentType, criteria);
  return customers.length;
}

export async function getSegmentCustomers(
  companyId: string,
  segmentType: string,
  criteria: unknown
): Promise<SegmentCustomer[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const supabase = await createClient();
  const crit = (criteria as Record<string, unknown>) ?? {};
  const thresholdCents = (crit.thresholdCents as number) ?? 500_000;
  const inactiveDays = (crit.inactiveDays as number) ?? 90;
  const newDays = (crit.newDays as number) ?? 30;

  const [customersRes, paymentsRes, bookingsRes] = await Promise.all([
    supabase.from("customers").select("id, name, email, created_at").eq("company_id", companyId),
    supabase
      .from("customer_payments")
      .select("customer_id, amount_cents")
      .eq("company_id", companyId)
      .eq("status", "paid"),
    supabase
      .from("bookings")
      .select("customer_id, created_at")
      .eq("company_id", companyId)
      .not("customer_id", "is", null),
  ]);

  if (customersRes.error) {
    console.error("[segments] getSegmentCustomers customers", customersRes.error.message);
    return [];
  }

  const customers = customersRes.data ?? [];
  const spend = new Map<string, number>();
  for (const payment of paymentsRes.data ?? []) {
    if (payment.customer_id) {
      spend.set(
        payment.customer_id,
        (spend.get(payment.customer_id) ?? 0) + payment.amount_cents
      );
    }
  }

  const bookingCounts = new Map<string, number>();
  const lastBooking = new Map<string, Date>();
  for (const booking of bookingsRes.data ?? []) {
    if (!booking.customer_id) continue;
    bookingCounts.set(
      booking.customer_id,
      (bookingCounts.get(booking.customer_id) ?? 0) + 1
    );
    const when = new Date(booking.created_at);
    const previous = lastBooking.get(booking.customer_id);
    if (!previous || when > previous) lastBooking.set(booking.customer_id, when);
  }

  const now = Date.now();
  const inactiveCutoff = new Date(now - inactiveDays * 24 * 60 * 60 * 1000);
  const newCutoff = new Date(now - newDays * 24 * 60 * 60 * 1000);

  return customers
    .filter((customer) => {
    switch (segmentType) {
      case "high_value":
        return (spend.get(customer.id) ?? 0) >= thresholdCents;
      case "repeat":
        return (bookingCounts.get(customer.id) ?? 0) >= 2;
      case "inactive": {
        const bookingCount = bookingCounts.get(customer.id) ?? 0;
        const last = lastBooking.get(customer.id);
        return bookingCount > 0 && (!last || last < inactiveCutoff);
      }
      case "new":
        return new Date(customer.created_at) >= newCutoff;
      default:
        return true;
    }
  })
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
    }));
}

export async function seedDefaultSegments(companyId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !companyId) return false;

  const supabase = await createClient();
  let seeded = false;

  for (const definition of DEFAULT_CUSTOMER_SEGMENTS) {
    const { data: existing, error: existingError } = await supabase
      .from("customer_segments")
      .select("id")
      .eq("company_id", companyId)
      .eq("segment_type", definition.segmentType)
      .maybeSingle();

    if (existingError) {
      if (isMissingSegmentsTable(existingError.message)) return false;
      console.error("[segments] seedDefaultSegments lookup", existingError.message);
      continue;
    }

    if (existing) continue;

    const { error } = await supabase.from("customer_segments").insert({
      company_id: companyId,
      name: definition.name,
      segment_type: definition.segmentType,
      criteria: definition.criteria,
    });

    if (error) {
      console.error("[segments] seedDefaultSegments insert", error.message);
      continue;
    }

    seeded = true;
  }

  return seeded;
}

export async function listRetentionCampaigns(companyId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("retention_campaigns")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[segments] listRetentionCampaigns", error.message);
    return [];
  }

  return data ?? [];
}
