"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyPermission } from "@/lib/services/company-access";
import {
  createWorkflow,
  deleteWorkflow,
  updateWorkflow,
} from "@/lib/services/workflow-engine";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { WorkflowStep, WorkflowTriggerType } from "@/types/v6-engine";

export type AutomationActionResult = { ok: true; id?: string } | { ok: false; error: string };

function revalidateAutomationPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/automations`);
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/dashboard/notifications`);
}

export async function createWorkflowAction(input: {
  companyId: string;
  companySlug: string;
  name: string;
  triggerType: WorkflowTriggerType;
  steps: WorkflowStep[];
}): Promise<AutomationActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyPermission(input.companyId, "manage_automations");
  if (!access.ok) return access;

  const result = await createWorkflow({
    companyId: input.companyId,
    name: input.name,
    triggerType: input.triggerType,
    steps: input.steps,
    userId: access.userId,
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Could not create workflow." };
  revalidateAutomationPaths(input.companySlug);
  return { ok: true, id: result.id };
}

export async function toggleWorkflowAction(input: {
  workflowId: string;
  companyId: string;
  companySlug: string;
  enabled: boolean;
}): Promise<AutomationActionResult> {
  const access = await requireCompanyPermission(input.companyId, "manage_automations");
  if (!access.ok) return access;

  const result = await updateWorkflow(input.workflowId, input.companyId, {
    enabled: input.enabled,
  });
  if (!result.ok) return { ok: false, error: result.error ?? "Could not update workflow." };
  revalidateAutomationPaths(input.companySlug);
  return { ok: true };
}

export async function deleteWorkflowAction(input: {
  workflowId: string;
  companyId: string;
  companySlug: string;
}): Promise<AutomationActionResult> {
  const access = await requireCompanyPermission(input.companyId, "manage_automations");
  if (!access.ok) return access;

  const result = await deleteWorkflow(input.workflowId, input.companyId);
  if (!result.ok) return { ok: false, error: result.error ?? "Could not delete workflow." };
  revalidateAutomationPaths(input.companySlug);
  return { ok: true };
}
