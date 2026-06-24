"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyPermission } from "@/lib/services/company-access";
import { createTask, deleteTask, updateTask } from "@/lib/services/tasks";
import type { CompanyTask } from "@/types/v6-engine";

export type TaskActionResult = { ok: true } | { ok: false; error: string };

function revalidateTaskPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/tasks`);
  revalidatePath(`/${slug}/dashboard`);
  revalidatePath(`/${slug}/dashboard/notifications`);
}

export async function createTaskAction(input: {
  companyId: string;
  companySlug: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority?: CompanyTask["priority"];
  dueDate?: string;
  status?: CompanyTask["status"];
}): Promise<TaskActionResult> {
  const access = await requireCompanyPermission(input.companyId, "manage_tasks");
  if (!access.ok) return access;

  const result = await createTask({
    companyId: input.companyId,
    title: input.title,
    description: input.description,
    assignedTo: input.assignedTo,
    priority: input.priority,
    dueDate: input.dueDate,
    status: input.status,
    createdBy: access.userId,
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Could not create task." };
  revalidateTaskPaths(input.companySlug);
  return { ok: true };
}

export async function updateTaskAction(input: {
  taskId: string;
  companyId: string;
  companySlug: string;
  title?: string;
  description?: string;
  status?: CompanyTask["status"];
  priority?: CompanyTask["priority"];
  assignedTo?: string | null;
  dueDate?: string | null;
}): Promise<TaskActionResult> {
  const access = await requireCompanyPermission(input.companyId, "manage_tasks");
  if (!access.ok) return access;

  const { taskId, companyId, companySlug, ...updates } = input;
  const result = await updateTask(taskId, companyId, updates);
  if (!result.ok) return { ok: false, error: result.error ?? "Could not update task." };
  revalidateTaskPaths(companySlug);
  return { ok: true };
}

export async function deleteTaskAction(input: {
  taskId: string;
  companyId: string;
  companySlug: string;
}): Promise<TaskActionResult> {
  const access = await requireCompanyPermission(input.companyId, "manage_tasks");
  if (!access.ok) return access;

  const result = await deleteTask(input.taskId, input.companyId);
  if (!result.ok) return { ok: false, error: result.error ?? "Could not delete task." };
  revalidateTaskPaths(input.companySlug);
  return { ok: true };
}
