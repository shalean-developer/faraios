"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyPermission } from "@/lib/services/company-access";
import {
  convertLeadToCustomer,
  updateLeadNotes,
  updateLeadStatus,
} from "@/lib/services/leads";
import type { LeadStatus } from "@/types/growth-engine";

export type LeadActionResult = { ok: true } | { ok: false; error: string };
export type LeadConvertResult =
  | { ok: true; customerId: string }
  | { ok: false; error: string };

function revalidateLeadPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/leads`);
  revalidatePath(`/${slug}/dashboard/growth`);
  revalidatePath(`/${slug}/dashboard/marketing`);
  revalidatePath(`/${slug}/dashboard/analytics`);
  revalidatePath(`/${slug}/dashboard`);
}

export async function updateLeadStatusAction(input: {
  companyId: string;
  companySlug: string;
  leadId: string;
  status: LeadStatus;
}): Promise<LeadActionResult> {
  const access = await requireCompanyPermission(input.companyId, "manage_marketing");
  if (!access.ok) return access;

  const result = await updateLeadStatus(input.companyId, input.leadId, input.status);
  if (result.ok) revalidateLeadPaths(input.companySlug);
  return result;
}

export async function updateLeadNotesAction(input: {
  companyId: string;
  companySlug: string;
  leadId: string;
  message: string;
}): Promise<LeadActionResult> {
  const access = await requireCompanyPermission(input.companyId, "manage_marketing");
  if (!access.ok) return access;

  const result = await updateLeadNotes(input.companyId, input.leadId, input.message);
  if (result.ok) revalidateLeadPaths(input.companySlug);
  return result;
}

export async function convertLeadToCustomerAction(input: {
  companyId: string;
  companySlug: string;
  leadId: string;
}): Promise<LeadConvertResult> {
  const access = await requireCompanyPermission(input.companyId, "manage_marketing");
  if (!access.ok) return access;

  const result = await convertLeadToCustomer(input.companyId, input.leadId);
  if (result.ok) {
    revalidateLeadPaths(input.companySlug);
    revalidatePath(`/${input.companySlug}/dashboard/customers`);
  }
  return result;
}
