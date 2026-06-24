"use server";

import { revalidatePath } from "next/cache";

import { parseCustomerCsv } from "@/lib/customers/csv";
import { requireCompanyPermission } from "@/lib/services/company-access";
import {
  findCustomerByEmail,
  findCustomerByPhone,
  getCustomerDeleteBlockers,
  upsertCustomerForCompany,
} from "@/lib/services/customers";
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

function revalidateCustomerPaths(slug: string, customerId?: string) {
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/dashboard/customers`);
  revalidatePath(`/${slug}/dashboard/bookings`);
  if (customerId) {
    revalidatePath(`/${slug}/dashboard/customers/${customerId}`);
  }
}

async function assertUniqueCustomerContact(
  companyId: string,
  input: { email?: string; phone?: string },
  excludeId?: string
): Promise<string | null> {
  const email = input.email?.trim();
  if (email) {
    const existing = await findCustomerByEmail(companyId, email, excludeId);
    if (existing) return "A customer with this email already exists.";
  }

  const phone = input.phone?.trim();
  if (phone) {
    const existing = await findCustomerByPhone(companyId, phone, excludeId);
    if (existing) return "A customer with this phone number already exists.";
  }

  return null;
}

function formatDeleteBlockers(blockers: {
  bookings: number;
  quotes: number;
  invoices: number;
}): string | null {
  const parts: string[] = [];
  if (blockers.bookings > 0) {
    parts.push(`${blockers.bookings} booking${blockers.bookings === 1 ? "" : "s"}`);
  }
  if (blockers.quotes > 0) {
    parts.push(`${blockers.quotes} quote${blockers.quotes === 1 ? "" : "s"}`);
  }
  if (blockers.invoices > 0) {
    parts.push(`${blockers.invoices} invoice${blockers.invoices === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) return null;
  return `This customer has ${parts.join(", ")}. Remove or reassign those records before deleting.`;
}

export async function createCustomer(
  input: CustomerInput
): Promise<CustomerMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Customer name is required." };

  const access = await requireCompanyPermission(input.companyId, "edit_customers");
  if (!access.ok) return access;

  const duplicateError = await assertUniqueCustomerContact(input.companyId, input);
  if (duplicateError) return { ok: false, error: duplicateError };

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

  const access = await requireCompanyPermission(input.companyId, "edit_customers");
  if (!access.ok) return access;

  const duplicateError = await assertUniqueCustomerContact(
    input.companyId,
    input,
    customerId
  );
  if (duplicateError) return { ok: false, error: duplicateError };

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

  revalidateCustomerPaths(input.companySlug, customerId);
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

  const access = await requireCompanyPermission(companyId, "edit_customers");
  if (!access.ok) return access;

  const blockers = await getCustomerDeleteBlockers(companyId, customerId);
  const blockerMessage = formatDeleteBlockers(blockers);
  if (blockerMessage) {
    return { ok: false, error: blockerMessage };
  }

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

export type ImportCustomersResult =
  | { ok: true; imported: number; skipped: number; errors: string[] }
  | { ok: false; error: string };

export async function importCustomers(
  companyId: string,
  companySlug: string,
  csvText: string
): Promise<ImportCustomersResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyPermission(companyId, "edit_customers");
  if (!access.ok) return access;

  let rows;
  try {
    rows = parseCustomerCsv(csvText);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not parse CSV file.",
    };
  }

  if (rows.length === 0) {
    return { ok: false, error: "No customer rows found in the CSV file." };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const line = index + 2;

    if (row.email) {
      const existing = await findCustomerByEmail(companyId, row.email);
      if (existing) {
        skipped += 1;
        continue;
      }
    }

    if (row.phone) {
      const existing = await findCustomerByPhone(companyId, row.phone);
      if (existing) {
        skipped += 1;
        continue;
      }
    }

    const result = await createCustomer({
      companyId,
      companySlug,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      notes: row.notes || undefined,
    });

    if (!result.ok) {
      errors.push(`Row ${line}: ${result.error}`);
      continue;
    }

    imported += 1;
  }

  revalidateCustomerPaths(companySlug);
  return { ok: true, imported, skipped, errors };
}

/** Find or create a customer when a booking is recorded. */
export async function upsertCustomerFromBooking(input: {
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}): Promise<string | null> {
  return upsertCustomerForCompany(input);
}
