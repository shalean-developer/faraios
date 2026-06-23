"use server";

import { revalidatePath } from "next/cache";

import { parseAddonsForSave } from "@/lib/company-services/addons";
import { parseServiceCsv } from "@/lib/company-services/csv";
import {
  isMissingSortOrderColumn,
  withoutSortOrder,
} from "@/lib/company-services/sort-order";
import { requireCompanyMembership } from "@/lib/services/company-access";
import {
  countBookingsForService,
  findServiceByName,
  getNextServiceSortOrder,
  getServiceById,
} from "@/lib/services/company-services";
import { parsePriceToCents } from "@/lib/operations/metrics";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { ServiceAddon } from "@/types/booking-form";

export type ServiceInput = {
  companyId: string;
  companySlug: string;
  name: string;
  category?: string;
  description?: string;
  price: string;
  durationMinutes?: string | number | null;
  active?: boolean;
  addons?: { id: string; name: string; price: string }[];
  sortOrder?: number;
};

export type ServiceMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type ImportServicesResult =
  | { ok: true; imported: number; skipped: number; errors: string[] }
  | { ok: false; error: string };

function revalidateServicePaths(slug: string, serviceId?: string) {
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/dashboard/services`);
  revalidatePath(`/${slug}/dashboard/bookings`);
  revalidatePath(`/${slug}/dashboard/calendar`);
  if (serviceId) {
    revalidatePath(`/${slug}/dashboard/services/${serviceId}`);
  }
}

function parseDurationMinutes(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (Number.isNaN(num) || num < 0) return null;
  return num;
}

function buildServiceRow(input: ServiceInput, sortOrder: number) {
  const name = input.name.trim();
  const priceCents = parsePriceToCents(input.price);
  if (!name) return { ok: false as const, error: "Service name is required." };
  if (priceCents === null) return { ok: false as const, error: "Enter a valid price." };

  const durationMinutes = parseDurationMinutes(input.durationMinutes ?? null);
  const addons = parseAddonsForSave(input.addons ?? []);

  return {
    ok: true as const,
    row: {
      company_id: input.companyId,
      name,
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      base_price_cents: priceCents,
      duration_minutes: durationMinutes,
      active: input.active ?? true,
      addons: addons as ServiceAddon[],
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    },
  };
}

async function insertCompanyServiceRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Record<string, unknown>
) {
  let result = await supabase
    .from("company_services")
    .insert(row)
    .select("id")
    .single();

  if (result.error && isMissingSortOrderColumn(result.error.message)) {
    result = await supabase
      .from("company_services")
      .insert(withoutSortOrder(row))
      .select("id")
      .single();
  }

  return result;
}

async function updateCompanyServiceRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serviceId: string,
  companyId: string,
  row: Record<string, unknown>
) {
  let result = await supabase
    .from("company_services")
    .update(row)
    .eq("id", serviceId)
    .eq("company_id", companyId);

  if (result.error && isMissingSortOrderColumn(result.error.message)) {
    result = await supabase
      .from("company_services")
      .update(withoutSortOrder(row))
      .eq("id", serviceId)
      .eq("company_id", companyId);
  }

  return result;
}

export async function createCompanyService(
  input: ServiceInput
): Promise<ServiceMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const sortOrder =
    input.sortOrder ?? (await getNextServiceSortOrder(input.companyId));
  const built = buildServiceRow(input, sortOrder);
  if (!built.ok) return built;

  const supabase = await createClient();
  const { data, error } = await insertCompanyServiceRow(supabase, built.row);

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

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const existing = await getServiceById(input.companyId, serviceId);
  if (!existing) return { ok: false, error: "Service not found." };

  const built = buildServiceRow(
    input,
    input.sortOrder ?? existing.sort_order ?? 0
  );
  if (!built.ok) return built;

  const supabase = await createClient();
  const { error } = await updateCompanyServiceRow(
    supabase,
    serviceId,
    input.companyId,
    built.row
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateServicePaths(input.companySlug, serviceId);
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

  const linkedBookings = await countBookingsForService(companyId, serviceId);
  if (linkedBookings > 0) {
    return {
      ok: false,
      error: `This service has ${linkedBookings} linked booking${linkedBookings === 1 ? "" : "s"}. Deactivate it instead of deleting.`,
    };
  }

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

export async function duplicateCompanyService(
  serviceId: string,
  companyId: string,
  companySlug: string
): Promise<ServiceMutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return access;

  const existing = await getServiceById(companyId, serviceId);
  if (!existing) return { ok: false, error: "Service not found." };

  const sortOrder = await getNextServiceSortOrder(companyId);
  const supabase = await createClient();
  const addons = (existing.addons ?? []) as ServiceAddon[];

  const insertRow = {
    company_id: companyId,
    name: `${existing.name} (Copy)`,
    category: existing.category,
    description: existing.description,
    base_price_cents: existing.base_price_cents,
    duration_minutes: existing.duration_minutes,
    active: existing.active,
    addons,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await insertCompanyServiceRow(supabase, insertRow);

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not duplicate service." };
  }

  revalidateServicePaths(companySlug);
  return { ok: true, id: data.id };
}

export async function moveCompanyService(
  serviceId: string,
  companyId: string,
  companySlug: string,
  direction: "up" | "down"
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { data: services, error } = await supabase
    .from("company_services")
    .select("id, sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !services?.length) {
    if (isMissingSortOrderColumn(error?.message)) {
      return {
        ok: false,
        error:
          "Service reordering requires a database update. Run migration 20260628100000_company_services_sort_order.sql in Supabase.",
      };
    }
    return { ok: false, error: error?.message ?? "Could not load services." };
  }

  const index = services.findIndex((service) => service.id === serviceId);
  if (index < 0) return { ok: false, error: "Service not found." };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= services.length) {
    return { ok: true };
  }

  const current = services[index];
  const swap = services[swapIndex];

  const updates = await Promise.all([
    supabase
      .from("company_services")
      .update({ sort_order: swap.sort_order, updated_at: new Date().toISOString() })
      .eq("id", current.id),
    supabase
      .from("company_services")
      .update({ sort_order: current.sort_order, updated_at: new Date().toISOString() })
      .eq("id", swap.id),
  ]);

  if (updates.some((result) => result.error)) {
    return { ok: false, error: "Could not reorder services." };
  }

  revalidateServicePaths(companySlug);
  return { ok: true };
}

export async function importServices(
  companyId: string,
  companySlug: string,
  csvText: string
): Promise<ImportServicesResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return access;

  let rows;
  try {
    rows = parseServiceCsv(csvText);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not parse CSV file.",
    };
  }

  if (rows.length === 0) {
    return { ok: false, error: "No service rows found in the CSV file." };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const existing = await findServiceByName(companyId, row.name);
    if (existing) {
      skipped += 1;
      continue;
    }

    const result = await createCompanyService({
      companyId,
      companySlug,
      name: row.name,
      category: row.category,
      description: row.description,
      price: row.price,
      durationMinutes: row.durationMinutes,
      active: row.active,
      addons: row.addons.map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: (addon.price_cents / 100).toFixed(2),
      })),
    });

    if (!result.ok) {
      errors.push(`Row ${line}: ${result.error}`);
      continue;
    }

    imported += 1;
  }

  revalidateServicePaths(companySlug);
  return { ok: true, imported, skipped, errors };
}

export async function createServicesFromTemplates(
  companyId: string,
  companySlug: string,
  templates: ServiceInput[]
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return access;

  let created = 0;

  for (const template of templates) {
    const existing = await findServiceByName(companyId, template.name);
    if (existing) continue;

    const result = await createCompanyService({
      ...template,
      companyId,
      companySlug,
    });
    if (result.ok) created += 1;
  }

  revalidateServicePaths(companySlug);
  return { ok: true, created };
}
