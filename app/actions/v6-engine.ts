"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyMembership, requireCompanyOwner } from "@/lib/services/company-access";
import { userHasPermission, updateRolePermissions, type PermissionKey } from "@/lib/services/permissions";
import {
  listWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "@/lib/services/workflow-engine";
import { listTasks, createTask, updateTask, deleteTask } from "@/lib/services/tasks";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/services/notifications";
import { upsertStaffProfile } from "@/lib/services/staff-profiles";
import { seedDefaultSegments } from "@/lib/services/customer-segments";
import { aiSearch } from "@/lib/services/ai-assistant";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { WorkflowStep, WorkflowTriggerType } from "@/types/v6-engine";
import type { CompanyTask } from "@/types/v6-engine";

export type V6MutationResult = { ok: true } | { ok: false; error: string };

function revalidateV6(slug: string) {
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/dashboard/insights`);
  revalidatePath(`/${slug}/dashboard/tasks`);
  revalidatePath(`/${slug}/dashboard/automations`);
  revalidatePath(`/${slug}/dashboard/team`);
  revalidatePath(`/${slug}/dashboard/notifications`);
}

export async function createWorkflowAction(input: {
  companyId: string;
  companySlug: string;
  name: string;
  triggerType: WorkflowTriggerType;
  steps: WorkflowStep[];
}): Promise<V6MutationResult & { id?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  const allowed = await userHasPermission(input.companyId, access.userId, "manage_automations");
  if (!allowed) return { ok: false, error: "You do not have permission to manage automations." };

  const result = await createWorkflow({
    companyId: input.companyId,
    name: input.name,
    triggerType: input.triggerType,
    steps: input.steps,
    userId: access.userId,
  });
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidateV6(input.companySlug);
  return { ok: true, id: result.id };
}

export async function toggleWorkflowAction(input: {
  workflowId: string;
  companyId: string;
  companySlug: string;
  enabled: boolean;
}): Promise<V6MutationResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  const result = await updateWorkflow(input.workflowId, input.companyId, {
    enabled: input.enabled,
  });
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidateV6(input.companySlug);
  return { ok: true };
}

export async function deleteWorkflowAction(input: {
  workflowId: string;
  companyId: string;
  companySlug: string;
}): Promise<V6MutationResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  const result = await deleteWorkflow(input.workflowId, input.companyId);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidateV6(input.companySlug);
  return { ok: true };
}

export async function createTaskAction(input: {
  companyId: string;
  companySlug: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority?: CompanyTask["priority"];
  dueDate?: string;
}): Promise<V6MutationResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  const result = await createTask({
    ...input,
    createdBy: access.userId,
  });
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidateV6(input.companySlug);
  return { ok: true };
}

export async function updateTaskAction(input: {
  taskId: string;
  companyId: string;
  companySlug: string;
  status?: CompanyTask["status"];
  priority?: CompanyTask["priority"];
  assignedTo?: string | null;
}): Promise<V6MutationResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  const result = await updateTask(input.taskId, input.companyId, input);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidateV6(input.companySlug);
  return { ok: true };
}

export async function deleteTaskAction(input: {
  taskId: string;
  companyId: string;
  companySlug: string;
}): Promise<V6MutationResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  const result = await deleteTask(input.taskId, input.companyId);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidateV6(input.companySlug);
  return { ok: true };
}

export async function updateStaffProfileAction(input: {
  companyId: string;
  companySlug: string;
  userId: string;
  displayName?: string;
  phone?: string;
  skills?: string[];
  bio?: string;
}): Promise<V6MutationResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  const result = await upsertStaffProfile(input);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidatePath(`/${input.companySlug}/dashboard/team`);
  return { ok: true };
}

export async function updateRolePermissionsAction(input: {
  companyId: string;
  companySlug: string;
  role: string;
  permissions: PermissionKey[];
}): Promise<V6MutationResult> {
  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;
  const result = await updateRolePermissions(input.companyId, input.role, input.permissions);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidatePath(`/${input.companySlug}/dashboard/team`);
  return { ok: true };
}

export async function markNotificationReadAction(input: {
  notificationId: string;
  companyId: string;
  companySlug: string;
}): Promise<V6MutationResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  const result = await markNotificationRead(input.notificationId, input.companyId);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidatePath(`/${input.companySlug}/dashboard/notifications`);
  return { ok: true };
}

export async function markAllNotificationsReadAction(input: {
  companyId: string;
  companySlug: string;
}): Promise<V6MutationResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  const result = await markAllNotificationsRead(input.companyId, access.userId);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed." };
  revalidatePath(`/${input.companySlug}/dashboard/notifications`);
  return { ok: true };
}

export async function seedSegmentsAction(input: {
  companyId: string;
  companySlug: string;
}): Promise<V6MutationResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;
  await seedDefaultSegments(input.companyId);
  revalidatePath(`/${input.companySlug}/dashboard/customers/segments`);
  return { ok: true };
}

export async function aiSearchAction(input: {
  companyId: string;
  query: string;
}) {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return { ok: false as const, error: access.error, results: [] };
  const allowed = await userHasPermission(input.companyId, access.userId, "view_ai_insights");
  if (!allowed) return { ok: false as const, error: "Permission denied.", results: [] };
  const results = await aiSearch(input.companyId, input.query);
  return { ok: true as const, results };
}

export { listWorkflows, listTasks };
