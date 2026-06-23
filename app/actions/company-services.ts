"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyMembership } from "@/lib/services/company-access";
import { parsePriceToCents } from "@/lib/operations/metrics";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type ServiceInput = {
  companyId: string;
  companySlug: string;
  name: string;
  category?: string;
  description?: string;
  price: string;
  active?: boolean;
};

export type ServiceMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function revalidateServicePaths(slug: string) {
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/dashboard/services`);
  revalidatePath(`/${slug}/dashboard/bookings`);
}

export async function createCompanyService(
  input: ServiceInput
): Promise<ServiceMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Service name is required." };

  const priceCents = parsePriceToCents(input.price);
  if (priceCents === null) {
    return { ok: false, error: "Enter a valid price." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_services")
    .insert({
      company_id: input.companyId,
      name,
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      base_price_cents: priceCents,
      active: input.active ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create service." };
  }

  revalidateServicePaths(input.companySlug);
  return { ok: true, id: data.id };
}

export async function updateCompanyService(
  serviceId: string,
  input: ServiceInput
): Promise<ServiceMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Service name is required." };

  const priceCents = parsePriceToCents(input.price);
  if (priceCents === null) {
    return { ok: false, error: "Enter a valid price." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_services")
    .update({
      name,
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      base_price_cents: priceCents,
      active: input.active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("company_id", input.companyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateServicePaths(input.companySlug);
  return { ok: true, id: serviceId };
}

export async function deleteCompanyService(
  serviceId: string,
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
    .from("company_services")
    .delete()
    .eq("id", serviceId)
    .eq("company_id", companyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateServicePaths(companySlug);
  return { ok: true };
}
