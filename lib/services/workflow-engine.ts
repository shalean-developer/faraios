import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { Workflow, WorkflowStep, WorkflowTriggerType } from "@/types/v6-engine";
import { createNotification } from "@/lib/services/notifications";
import { createTask } from "@/lib/services/tasks";
import { logCompanyActivity } from "@/lib/services/activity-log";

function mapWorkflow(row: Record<string, unknown>): Workflow {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    name: row.name as string,
    triggerType: row.trigger_type as WorkflowTriggerType,
    triggerConfig: (row.trigger_config as Record<string, unknown>) ?? {},
    steps: (row.steps as WorkflowStep[]) ?? [],
    enabled: row.enabled as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listWorkflows(companyId: string): Promise<Workflow[]> {
  if (!isSupabaseConfigured() || !companyId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[workflows] listWorkflows", error.message);
    return [];
  }
  return (data ?? []).map(mapWorkflow);
}

export type WorkflowListSummary = {
  total: number;
  enabled: number;
  disabled: number;
};

export function summarizeWorkflows(workflows: Workflow[]): WorkflowListSummary {
  let enabled = 0;
  for (const workflow of workflows) {
    if (workflow.enabled) enabled += 1;
  }
  return {
    total: workflows.length,
    enabled,
    disabled: workflows.length - enabled,
  };
}

export async function createWorkflow(input: {
  companyId: string;
  name: string;
  triggerType: WorkflowTriggerType;
  steps: WorkflowStep[];
  userId?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflows")
    .insert({
      company_id: input.companyId,
      name: input.name,
      trigger_type: input.triggerType,
      steps: input.steps,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logCompanyActivity({
    companyId: input.companyId,
    userId: input.userId,
    action: "workflow_created",
    entityType: "workflow",
    entityId: data.id,
    metadata: { name: input.name, trigger: input.triggerType },
  });
  return { ok: true, id: data.id };
}

export async function updateWorkflow(
  workflowId: string,
  companyId: string,
  updates: Partial<{ name: string; steps: WorkflowStep[]; enabled: boolean }>
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.steps !== undefined) payload.steps = updates.steps;
  if (updates.enabled !== undefined) payload.enabled = updates.enabled;

  const { error } = await supabase
    .from("workflows")
    .update(payload)
    .eq("id", workflowId)
    .eq("company_id", companyId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteWorkflow(
  workflowId: string,
  companyId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", workflowId)
    .eq("company_id", companyId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export type TriggerContext = {
  companyId: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
};

async function executeStep(
  companyId: string,
  step: WorkflowStep,
  ctx: TriggerContext
): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  switch (step.action) {
    case "send_email": {
      const to = (step.config.to as string) ?? (ctx.payload?.customerEmail as string);
      const subject = (step.config.subject as string) ?? "Message from your service provider";
      const body = (step.config.body as string) ?? "";
      if (to && process.env.RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.BOOKING_FROM_EMAIL ?? "noreply@faraios.com",
            to: [to],
            subject,
            html: `<p>${body}</p>`,
          }),
        }).catch(() => null);
      }
      break;
    }
    case "create_task":
      await createTask({
        companyId,
        title: (step.config.title as string) ?? "Follow-up task",
        description: step.config.description as string | undefined,
        assignedTo: step.config.assignedTo as string | undefined,
        sourceType: ctx.entityType,
        sourceId: ctx.entityId,
        priority: (step.config.priority as "low" | "medium" | "high" | "urgent") ?? "medium",
      });
      break;
    case "assign_staff":
      if (ctx.entityType === "booking" && step.config.staffId) {
        await admin.client
          .from("bookings")
          .update({ assigned_staff_id: step.config.staffId as string })
          .eq("id", ctx.entityId)
          .eq("company_id", companyId);
      }
      break;
    case "change_status":
      if (ctx.entityType === "booking" && step.config.status) {
        await admin.client
          .from("bookings")
          .update({ status: step.config.status as string })
          .eq("id", ctx.entityId)
          .eq("company_id", companyId);
      }
      break;
    case "add_customer_tag":
      if (ctx.payload?.customerId && step.config.tag) {
        const { data: customer } = await admin.client
          .from("customers")
          .select("tags")
          .eq("id", ctx.payload.customerId as string)
          .maybeSingle();
        const tags = [...new Set([...(customer?.tags ?? []), step.config.tag as string])];
        await admin.client
          .from("customers")
          .update({ tags })
          .eq("id", ctx.payload.customerId as string);
      }
      break;
    case "schedule_followup":
      break;
    case "send_sms":
    case "send_whatsapp":
      // SMS/WhatsApp providers are not wired yet — hidden from workflow UI until ready.
      break;
  }
}

export async function triggerWorkflows(
  triggerType: WorkflowTriggerType,
  ctx: TriggerContext
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  const { data: workflows } = await admin.client
    .from("workflows")
    .select("*")
    .eq("company_id", ctx.companyId)
    .eq("trigger_type", triggerType)
    .eq("enabled", true);

  for (const wf of workflows ?? []) {
    const steps = (wf.steps as WorkflowStep[]) ?? [];
    if (steps.length === 0) continue;

    const { data: run } = await admin.client
      .from("workflow_runs")
      .insert({
        workflow_id: wf.id,
        company_id: ctx.companyId,
        trigger_entity_type: ctx.entityType,
        trigger_entity_id: ctx.entityId,
        status: "running",
      })
      .select("id")
      .single();

    if (!run) continue;

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.delayDays && step.delayDays > 0) {
          const scheduledFor = new Date();
          scheduledFor.setDate(scheduledFor.getDate() + step.delayDays);
          await admin.client.from("automation_jobs").insert({
            company_id: ctx.companyId,
            workflow_run_id: run.id,
            step_index: i,
            action_type: step.action,
            action_config: step.config,
            scheduled_for: scheduledFor.toISOString(),
          });
        } else {
          await executeStep(ctx.companyId, step, ctx);
        }
      }

      await admin.client
        .from("workflow_runs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", run.id);

      await createNotification({
        companyId: ctx.companyId,
        type: "automation",
        title: `Workflow "${wf.name}" completed`,
        body: `Triggered by ${triggerType.replace(/_/g, " ")}`,
        entityType: "workflow",
        entityId: wf.id,
      });
    } catch (err) {
      await admin.client
        .from("workflow_runs")
        .update({
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", run.id);
    }
  }
}

export async function processPendingAutomationJobs(): Promise<number> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return 0;

  const now = new Date().toISOString();
  const { data: jobs } = await admin.client
    .from("automation_jobs")
    .select("*, workflow_runs(trigger_entity_type, trigger_entity_id)")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .limit(50);

  let processed = 0;
  for (const job of jobs ?? []) {
    const run = job.workflow_runs as {
      trigger_entity_type: string;
      trigger_entity_id: string;
    } | null;
    if (!run) continue;

    const step: WorkflowStep = {
      action: job.action_type as WorkflowStep["action"],
      config: (job.action_config as Record<string, unknown>) ?? {},
    };

    try {
      await executeStep(job.company_id, step, {
        companyId: job.company_id,
        entityType: run.trigger_entity_type,
        entityId: run.trigger_entity_id,
      });
      await admin.client
        .from("automation_jobs")
        .update({ status: "completed", executed_at: now })
        .eq("id", job.id);
      processed += 1;
    } catch (err) {
      await admin.client
        .from("automation_jobs")
        .update({
          status: "failed",
          executed_at: now,
          error: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", job.id);
    }
  }
  return processed;
}
