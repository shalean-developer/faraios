import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { CompanyTask } from "@/types/v6-engine";

function mapTask(row: Record<string, unknown>): CompanyTask {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    title: row.title as string,
    description: row.description as string | null,
    assignedTo: row.assigned_to as string | null,
    status: row.status as CompanyTask["status"],
    priority: row.priority as CompanyTask["priority"],
    dueDate: row.due_date as string | null,
    sourceType: row.source_type as string | null,
    sourceId: row.source_id as string | null,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export type TaskListSummary = {
  total: number;
  open: number;
  inProgress: number;
  done: number;
  overdue: number;
};

export function summarizeTasks(tasks: CompanyTask[]): TaskListSummary {
  const today = new Date().toISOString().slice(0, 10);
  let open = 0;
  let inProgress = 0;
  let done = 0;
  let overdue = 0;

  for (const task of tasks) {
    if (task.status === "open") open += 1;
    else if (task.status === "in_progress") inProgress += 1;
    else if (task.status === "done") done += 1;

    if (
      task.dueDate &&
      task.dueDate < today &&
      task.status !== "done" &&
      task.status !== "cancelled"
    ) {
      overdue += 1;
    }
  }

  return {
    total: tasks.length,
    open,
    inProgress,
    done,
    overdue,
  };
}

export async function listTasks(
  companyId: string,
  filters?: { status?: string; assignedTo?: string }
): Promise<CompanyTask[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase
    .from("company_tasks")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
  const { data, error } = await query;
  if (error) {
    console.error("[tasks] listTasks", error.message);
    return [];
  }
  return (data ?? []).map(mapTask);
}

export async function createTask(input: {
  companyId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  status?: CompanyTask["status"];
  priority?: CompanyTask["priority"];
  dueDate?: string;
  sourceType?: string;
  sourceId?: string;
  createdBy?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_tasks")
    .insert({
      company_id: input.companyId,
      title: input.title,
      description: input.description ?? null,
      assigned_to: input.assignedTo ?? null,
      status: input.status ?? "open",
      priority: input.priority ?? "medium",
      due_date: input.dueDate ?? null,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updateTask(
  taskId: string,
  companyId: string,
  updates: Partial<{
    title: string;
    description: string;
    assignedTo: string | null;
    status: CompanyTask["status"];
    priority: CompanyTask["priority"];
    dueDate: string | null;
  }>
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;

  const { error } = await supabase
    .from("company_tasks")
    .update(payload)
    .eq("id", taskId)
    .eq("company_id", companyId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteTask(
  taskId: string,
  companyId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_tasks")
    .delete()
    .eq("id", taskId)
    .eq("company_id", companyId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
