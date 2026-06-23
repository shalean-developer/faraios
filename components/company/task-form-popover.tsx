"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createTaskAction, updateTaskAction } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import type { CompanyMember } from "@/lib/services/team";
import type { CompanyTask } from "@/types/v6-engine";

const STATUS_OPTIONS = ["open", "in_progress", "done", "cancelled"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const;

type FormState = {
  title: string;
  description: string;
  priority: CompanyTask["priority"];
  status: CompanyTask["status"];
  assignedTo: string;
  dueDate: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  priority: "medium",
  status: "open",
  assignedTo: "",
  dueDate: "",
};

function taskToForm(task: CompanyTask): FormState {
  return {
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    status: task.status,
    assignedTo: task.assignedTo ?? "",
    dueDate: task.dueDate ?? "",
  };
}

export function TaskFormPopover({
  open,
  onClose,
  slug,
  companyId,
  members,
  task = null,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  companyId: string;
  members: CompanyMember[];
  task?: CompanyTask | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEditing = task != null;
  const title = isEditing ? "Edit task" : "New task";

  useEffect(() => {
    if (!open) return;
    setForm(task ? taskToForm(task) : emptyForm);
    setError(null);
  }, [open, task]);

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
      const payload = {
        companyId,
        companySlug: slug,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
        dueDate: form.dueDate || undefined,
      };

      const result = isEditing
        ? await updateTaskAction({
            ...payload,
            taskId: task.id,
            status: form.status,
            assignedTo: form.assignedTo || null,
            dueDate: form.dueDate || null,
          })
        : await createTaskAction(payload);

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
        aria-label="Close task form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-popover-title"
        className="relative z-10 flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <p id="task-form-popover-title" className="text-sm font-semibold text-slate-900">
            {title}
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
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Task title"
              required
            />
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((current) => ({ ...current, description: e.target.value }))
              }
              className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Description (optional)"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Priority</span>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      priority: e.target.value as CompanyTask["priority"],
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {isEditing ? (
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Status</span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        status: e.target.value as CompanyTask["status"],
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Due date</span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, dueDate: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              )}
            </div>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Assign to</span>
              <select
                value={form.assignedTo}
                onChange={(e) =>
                  setForm((current) => ({ ...current, assignedTo: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name?.trim() || member.email}
                  </option>
                ))}
              </select>
            </label>
            {isEditing ? (
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Due date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, dueDate: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            ) : null}
          </div>

          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

          <div className="mt-4 flex gap-2">
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Saving..." : isEditing ? "Update task" : "Add task"}
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
