"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createWorkflowAction } from "@/app/actions/automations";
import { Button } from "@/components/ui/button";
import {
  WORKFLOW_ACTIONS,
  WORKFLOW_TRIGGERS,
} from "@/lib/automations/constants";
import type { WorkflowActionType, WorkflowStep, WorkflowTriggerType } from "@/types/v6-engine";

type FormState = {
  name: string;
  triggerType: WorkflowTriggerType;
  action: WorkflowActionType;
  delayDays: string;
  emailSubject: string;
  emailBody: string;
  taskTitle: string;
  customerTag: string;
};

const emptyForm: FormState = {
  name: "",
  triggerType: "booking_completed",
  action: "send_email",
  delayDays: "0",
  emailSubject: "Thank you for your business",
  emailBody: "We appreciate you choosing us. Let us know if you need anything else.",
  taskTitle: "Follow up with customer",
  customerTag: "",
};

export function WorkflowFormPopover({
  open,
  onClose,
  slug,
  companyId,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  companyId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const delayDays = Number.parseInt(form.delayDays || "0", 10);
      let config: Record<string, unknown> = {};

      switch (form.action) {
        case "send_email":
          config = {
            subject: form.emailSubject.trim(),
            body: form.emailBody.trim(),
          };
          break;
        case "create_task":
          config = { title: form.taskTitle.trim() || "Follow up with customer" };
          break;
        case "add_customer_tag":
          config = { tag: form.customerTag.trim() };
          break;
        default:
          config = {};
      }

      const steps: WorkflowStep[] = [
        {
          action: form.action,
          config,
          delayDays: delayDays > 0 ? delayDays : undefined,
        },
      ];

      const result = await createWorkflowAction({
        companyId,
        companySlug: slug,
        name: form.name.trim(),
        triggerType: form.triggerType,
        steps,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onClose();
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close workflow form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-form-popover-title"
        className="relative z-10 flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <p id="workflow-form-popover-title" className="text-sm font-semibold text-slate-900">
            New workflow
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="min-h-0 overflow-y-auto p-4">
          <div className="grid gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Workflow name"
              required
            />
            <label className="block text-sm">
              <span className="font-medium text-slate-700">When this happens</span>
              <select
                value={form.triggerType}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    triggerType: e.target.value as WorkflowTriggerType,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {WORKFLOW_TRIGGERS.map((trigger) => (
                  <option key={trigger.value} value={trigger.value}>
                    {trigger.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Then do this</span>
              <select
                value={form.action}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    action: e.target.value as WorkflowActionType,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {WORKFLOW_ACTIONS.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Delay (days)</span>
              <input
                type="number"
                min="0"
                value={form.delayDays}
                onChange={(e) =>
                  setForm((current) => ({ ...current, delayDays: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            {form.action === "send_email" ? (
              <>
                <input
                  value={form.emailSubject}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, emailSubject: e.target.value }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Email subject"
                />
                <textarea
                  value={form.emailBody}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, emailBody: e.target.value }))
                  }
                  className="min-h-[96px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Email body"
                />
              </>
            ) : null}

            {form.action === "create_task" ? (
              <input
                value={form.taskTitle}
                onChange={(e) =>
                  setForm((current) => ({ ...current, taskTitle: e.target.value }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Task title"
              />
            ) : null}

            {form.action === "add_customer_tag" ? (
              <input
                value={form.customerTag}
                onChange={(e) =>
                  setForm((current) => ({ ...current, customerTag: e.target.value }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Tag name"
                required
              />
            ) : null}
          </div>

          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

          <div className="mt-4 flex gap-2">
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Creating..." : "Create workflow"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
