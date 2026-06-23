import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizePhoneDigits, phonesMatch } from "@/lib/customers/phone";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { Customer } from "@/types/database";

export type CustomerListStats = {
  bookingCount: number;
  quoteCount: number;
  invoiceCount: number;
  revenueCents: number;
};

export type CustomerDeleteBlockers = {
  bookings: number;
  quotes: number;
  invoices: number;
};

type UpsertCustomerInput = {
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

function resolveAdminClient(client?: SupabaseClient) {
  if (client) return { ok: true as const, client };
  return tryCreateAdminClient();
}

async function findCustomerByPhoneWithClient(
  supabase: SupabaseClient,
  companyId: string,
  phone: string,
  excludeId?: string
): Promise<Customer | null> {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .not("phone", "is", null);

  if (error || !data?.length) return null;

  const match = data.find(
    (row) => row.id !== excludeId && phonesMatch(row.phone, phone)
  );

  return (match as Customer | undefined) ?? null;
}

async function mergeExistingCustomer(
  supabase: SupabaseClient,
  existing: Pick<Customer, "id" | "name" | "phone" | "notes" | "email">,
  input: UpsertCustomerInput
): Promise<string> {
  const updates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };
  const name = input.name.trim();
  const phone = input.phone?.trim() || null;
  const notes = input.notes?.trim() || null;
  const email = input.email?.trim() || null;

  if (!existing.name?.trim() && name) updates.name = name;
  if (phone && !existing.phone) updates.phone = phone;
  if (notes && !existing.notes) updates.notes = notes;
  if (email && !existing.email) updates.email = email;

  if (Object.keys(updates).length > 1) {
    await supabase.from("customers").update(updates).eq("id", existing.id);
  }

  return existing.id;
}

/** Find or create a customer record (uses service role when available). */
export async function upsertCustomerForCompany(
  input: UpsertCustomerInput,
  client?: SupabaseClient
): Promise<string | null> {
  const name = input.name.trim();
  if (!name || !input.companyId) return null;

  const adminResult = resolveAdminClient(client);
  if (!adminResult.ok) return null;

  const supabase = adminResult.client;
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (email) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id, name, phone, notes, email")
      .eq("company_id", input.companyId)
      .ilike("email", email)
      .maybeSingle();

    if (existing?.id) {
      return mergeExistingCustomer(supabase, existing, input);
    }
  }

  if (phone) {
    const existingByPhone = await findCustomerByPhoneWithClient(
      supabase,
      input.companyId,
      phone
    );
    if (existingByPhone) {
      return mergeExistingCustomer(supabase, existingByPhone, input);
    }
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: input.companyId,
      name,
      email,
      phone,
      notes,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[customers] upsertCustomerForCompany", error?.message);
    return null;
  }

  return data.id;
}

/** Backfill customer records from bookings that are not linked yet. */
export async function syncCustomersFromBookings(companyId: string): Promise<number> {
  if (!companyId) return 0;

  const adminResult = tryCreateAdminClient();
  if (!adminResult.ok) return 0;

  const { data: bookings, error } = await adminResult.client
    .from("bookings")
    .select("id, customer_id, customer_name, customer_email, customer_phone")
    .eq("company_id", companyId)
    .is("customer_id", null)
    .not("customer_name", "is", null);

  if (error || !bookings?.length) {
    if (error) {
      console.error("[customers] syncCustomersFromBookings", error.message);
    }
    return 0;
  }

  let linked = 0;

  for (const booking of bookings) {
    const name = booking.customer_name?.trim();
    if (!name) continue;

    const customerId = await upsertCustomerForCompany(
      {
        companyId,
        name,
        email: booking.customer_email,
        phone: booking.customer_phone,
      },
      adminResult.client
    );

    if (!customerId) continue;

    const { error: updateError } = await adminResult.client
      .from("bookings")
      .update({ customer_id: customerId, updated_at: new Date().toISOString() })
      .eq("id", booking.id)
      .eq("company_id", companyId);

    if (!updateError) linked += 1;
  }

  return linked;
}

export async function listCustomersForCompany(
  companyId: string
): Promise<Customer[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[customers] listCustomersForCompany", error.message);
    return [];
  }

  return (data ?? []) as Customer[];
}

export async function getCustomerById(
  companyId: string,
  customerId: string
): Promise<Customer | null> {
  if (!isSupabaseConfigured() || !companyId || !customerId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    console.error("[customers] getCustomerById", error.message);
    return null;
  }

  return data as Customer | null;
}

export async function findCustomerByEmail(
  companyId: string,
  email: string,
  excludeId?: string
): Promise<Customer | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .ilike("email", normalized);

  if (error) {
    console.error("[customers] findCustomerByEmail", error.message);
    return null;
  }

  const match = (data ?? []).find((row) => row.id !== excludeId);
  return (match as Customer | undefined) ?? null;
}

export async function findCustomerByPhone(
  companyId: string,
  phone: string,
  excludeId?: string
): Promise<Customer | null> {
  if (!normalizePhoneDigits(phone)) return null;

  const supabase = await createClient();
  return findCustomerByPhoneWithClient(supabase, companyId, phone, excludeId);
}

export async function getCustomerStatsForCompany(
  companyId: string
): Promise<Record<string, CustomerListStats>> {
  if (!isSupabaseConfigured() || !companyId) return {};

  const supabase = await createClient();
  const [bookingsRes, quotesRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("customer_id, price_cents")
      .eq("company_id", companyId)
      .not("customer_id", "is", null),
    supabase
      .from("quotes")
      .select("customer_id")
      .eq("company_id", companyId),
    supabase
      .from("invoices")
      .select("customer_id")
      .eq("company_id", companyId),
    supabase
      .from("customer_payments")
      .select("customer_id, amount_cents, status")
      .eq("company_id", companyId)
      .not("customer_id", "is", null),
  ]);

  const stats: Record<string, CustomerListStats> = {};

  const ensure = (customerId: string) => {
    if (!stats[customerId]) {
      stats[customerId] = {
        bookingCount: 0,
        quoteCount: 0,
        invoiceCount: 0,
        revenueCents: 0,
      };
    }
    return stats[customerId];
  };

  for (const row of bookingsRes.data ?? []) {
    const customerId = row.customer_id as string;
    ensure(customerId).bookingCount += 1;
  }

  for (const row of quotesRes.data ?? []) {
    const customerId = row.customer_id as string;
    ensure(customerId).quoteCount += 1;
  }

  for (const row of invoicesRes.data ?? []) {
    const customerId = row.customer_id as string;
    ensure(customerId).invoiceCount += 1;
  }

  for (const row of paymentsRes.data ?? []) {
    if (row.status !== "paid") continue;
    const customerId = row.customer_id as string;
    ensure(customerId).revenueCents += row.amount_cents ?? 0;
  }

  return stats;
}

export async function getCustomerDeleteBlockers(
  companyId: string,
  customerId: string
): Promise<CustomerDeleteBlockers> {
  if (!isSupabaseConfigured() || !companyId || !customerId) {
    return { bookings: 0, quotes: 0, invoices: 0 };
  }

  const supabase = await createClient();
  const [bookings, quotes, invoices] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("customer_id", customerId),
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("customer_id", customerId),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("customer_id", customerId),
  ]);

  return {
    bookings: bookings.count ?? 0,
    quotes: quotes.count ?? 0,
    invoices: invoices.count ?? 0,
  };
}

export async function countCustomersForCompany(
  companyId: string
): Promise<number> {
  if (!isSupabaseConfigured() || !companyId) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    console.error("[customers] countCustomersForCompany", error.message);
    return 0;
  }

  return count ?? 0;
}
