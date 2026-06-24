import type { Lead, LeadStatus } from "@/types/growth-engine";
import { upsertCustomerForCompany } from "@/lib/services/customers";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type CreateLeadInput = {
  companyId: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  leadType?: Lead["lead_type"];
  source?: string;
  sourceWebsite?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  conversionPage?: string;
};

export type LeadListSummary = {
  total: number;
  newCount: number;
  contactedCount: number;
  convertedCount: number;
  archivedCount: number;
};

function mapRow(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: (row.name as string) ?? null,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    message: (row.message as string) ?? null,
    lead_type: row.lead_type as Lead["lead_type"],
    source: (row.source as string) ?? null,
    source_website: (row.source_website as string) ?? null,
    referrer: (row.referrer as string) ?? null,
    utm_source: (row.utm_source as string) ?? null,
    utm_medium: (row.utm_medium as string) ?? null,
    utm_campaign: (row.utm_campaign as string) ?? null,
    landing_page: (row.landing_page as string) ?? null,
    conversion_page: (row.conversion_page as string) ?? null,
    status: row.status as Lead["status"],
    customer_id: (row.customer_id as string) ?? null,
    created_at: row.created_at as string,
  };
}

export function summarizeLeads(leads: Lead[]): LeadListSummary {
  let newCount = 0;
  let contactedCount = 0;
  let convertedCount = 0;
  let archivedCount = 0;

  for (const lead of leads) {
    switch (lead.status) {
      case "new":
        newCount += 1;
        break;
      case "contacted":
        contactedCount += 1;
        break;
      case "converted":
        convertedCount += 1;
        break;
      case "archived":
        archivedCount += 1;
        break;
    }
  }

  return {
    total: leads.length,
    newCount,
    contactedCount,
    convertedCount,
    archivedCount,
  };
}

export async function createLead(
  input: CreateLeadInput
): Promise<{ ok: true; leadId: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "API not configured." };

  const { data, error } = await admin.client
    .from("leads")
    .insert({
      company_id: input.companyId,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      message: input.message ?? null,
      lead_type: input.leadType ?? "contact",
      source: input.source ?? "website",
      source_website: input.sourceWebsite ?? null,
      referrer: input.referrer ?? null,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      landing_page: input.landingPage ?? null,
      conversion_page: input.conversionPage ?? null,
      status: "new",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create lead." };
  return { ok: true, leadId: data.id as string };
}

export async function listLeadsForCompany(
  companyId: string,
  options?: { limit?: number; status?: LeadStatus | "all" }
): Promise<Lead[]> {
  if (!isSupabaseConfigured() || !companyId) return [];

  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 200);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[leads] listLeadsForCompany", error.message);
    return [];
  }

  return (data ?? []).map(mapRow);
}

/** @deprecated Use listLeadsForCompany — kept for public API callers. */
export async function listLeads(companyId: string, limit = 50): Promise<Lead[]> {
  return listLeadsForCompany(companyId, { limit });
}

export async function getLeadById(
  companyId: string,
  leadId: string
): Promise<Lead | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", leadId)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}

export async function updateLeadStatus(
  companyId: string,
  leadId: string,
  status: LeadStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("company_id", companyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateLeadNotes(
  companyId: string,
  leadId: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ message: message.trim() || null })
    .eq("id", leadId)
    .eq("company_id", companyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function convertLeadToCustomer(
  companyId: string,
  leadId: string
): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };

  const lead = await getLeadById(companyId, leadId);
  if (!lead) return { ok: false, error: "Lead not found." };
  if (lead.status === "converted" && lead.customer_id) {
    return { ok: true, customerId: lead.customer_id };
  }
  if (!lead.name?.trim()) {
    return { ok: false, error: "Lead must have a name before converting to a customer." };
  }

  const customerId = await upsertCustomerForCompany({
    companyId,
    name: lead.name.trim(),
    email: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    notes: lead.message ? `Converted from lead (${lead.lead_type})` : undefined,
  });

  if (!customerId) {
    return { ok: false, error: "Could not create customer." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      status: "converted",
      customer_id: customerId,
    })
    .eq("id", leadId)
    .eq("company_id", companyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, customerId };
}
