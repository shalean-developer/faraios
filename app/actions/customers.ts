"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyMembership } from "@/lib/services/company-access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type CustomerInput = {
  companyId: string;
  companySlug: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export type CustomerMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function revalidateCustomerPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/dashboard/customers`);
  revalidatePath(`/${slug}/dashboard/bookings`);
}

export async function createCustomer(
  input: CustomerInput
): Promise<CustomerMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Customer name is required." };

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: input.companyId,
      name,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create customer." };
  }

  revalidateCustomerPaths(input.companySlug);
  return { ok: true, id: data.id };
}

export async function updateCustomer(
  customerId: string,
  input: CustomerInput
): Promise<CustomerMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Customer name is required." };

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("company_id", input.companyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateCustomerPaths(input.companySlug);
  return { ok: true, id: customerId };
}

export async function deleteCustomer(
  customerId: string,
  companyId: string,
  companySlug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("company_id", companyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateCustomerPaths(companySlug);
  return { ok: true };
}

/** Find or create a customer when a booking is recorded. */
export async function upsertCustomerFromBooking(input: {
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}): Promise<string | null> {
  const name = input.name.trim();
  if (!name) return null;

  const supabase = await createClient();
  const email = input.email?.trim() || null;

  if (email) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", input.companyId)
      .ilike("email", email)
      .maybeSingle();

    if (existing?.id) return existing.id;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: input.companyId,
      name,
      email,
      phone: input.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[customers] upsertCustomerFromBooking", error?.message);
    return null;
  }

  return data.id;
}
