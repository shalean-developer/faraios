import type { WorkflowActionType, WorkflowTriggerType } from "@/types/v6-engine";

export const WORKFLOW_TRIGGERS: { value: WorkflowTriggerType; label: string }[] = [
  { value: "booking_created", label: "Booking created" },
  { value: "booking_confirmed", label: "Booking confirmed" },
  { value: "booking_completed", label: "Booking completed" },
  { value: "booking_cancelled", label: "Booking cancelled" },
  { value: "quote_accepted", label: "Quote accepted" },
  { value: "invoice_paid", label: "Invoice paid" },
  { value: "customer_created", label: "Customer created" },
  { value: "review_submitted", label: "Review submitted" },
  { value: "lead_created", label: "New lead" },
];

export const WORKFLOW_ACTIONS: { value: WorkflowActionType; label: string }[] = [
  { value: "send_email", label: "Send email" },
  { value: "create_task", label: "Create task" },
  { value: "assign_staff", label: "Assign staff" },
  { value: "add_customer_tag", label: "Add customer tag" },
  { value: "schedule_followup", label: "Schedule follow-up" },
];

export function workflowTriggerLabel(value: string): string {
  return WORKFLOW_TRIGGERS.find((item) => item.value === value)?.label ?? value.replace(/_/g, " ");
}

export function workflowActionLabel(value: string): string {
  return WORKFLOW_ACTIONS.find((item) => item.value === value)?.label ?? value.replace(/_/g, " ");
}
