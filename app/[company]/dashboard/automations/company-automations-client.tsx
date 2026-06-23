"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteWorkflowAction, toggleWorkflowAction } from "@/app/actions/automations";
import { WorkflowFormPopover } from "@/components/company/workflow-form-popover";
import { Button } from "@/components/ui/button";
import {
  workflowActionLabel,
  workflowTriggerLabel,
} from "@/lib/automations/constants";
import {
  companyNotificationsPath,
  companyTasksPath,
} from "@/lib/paths/company";
import type { WorkflowListSummary } from "@/lib/services/workflow-engine";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";
import type { Workflow } from "@/types/v6-engine";

type StatusFilter = "all" | "enabled" | "disabled";

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CompanyAutomationsClient({
  slug,
  company,
  workflows: initialWorkflows,
  summary,
}: {
  slug: string;
  company: CompanyWithIndustry;
  workflows: Workflow[];
  summary: WorkflowListSummary;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialWorkflows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialWorkflows);
  }, [initialWorkflows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((workflow) => {
      if (statusFilter === "enabled" && !workflow.enabled) return false;
      if (statusFilter === "disabled" && workflow.enabled) return false;
      if (!query) return true;

      return (
        workflow.name.toLowerCase().includes(query) ||
        workflow.triggerType.toLowerCase().includes(query) ||
        workflow.steps.some((step) => step.action.toLowerCase().includes(query))
      );
    });
  }, [rows, search, statusFilter]);

  const onToggle = (workflow: Workflow) => {
    setError(null);
    startTransition(async () => {
      const result = await toggleWorkflowAction({
        workflowId: workflow.id,
        companyId: company.id,
        companySlug: slug,
        enabled: !workflow.enabled,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onDelete = (workflow: Workflow) => {
    if (!window.confirm(`Delete workflow "${workflow.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteWorkflowAction({
        workflowId: workflow.id,
        companyId: company.id,
        companySlug: slug,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const statCards = [
    { label: "Total workflows", value: String(summary.total) },
    { label: "Enabled", value: String(summary.enabled) },
    { label: "Disabled", value: String(summary.disabled) },
  ];

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Automations</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Automate follow-ups when bookings complete, invoices are paid, leads arrive, and more.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-xl"
          variant={showWorkflowForm ? "outline" : "default"}
          aria-expanded={showWorkflowForm}
          aria-haspopup="dialog"
          onClick={() => setShowWorkflowForm((open) => !open)}
        >
          New workflow
        </Button>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-72"
            placeholder="Search workflows..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All workflows</option>
            <option value="enabled">Enabled only</option>
            <option value="disabled">Disabled only</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={companyTasksPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Tasks →
          </Link>
          <Link
            href={companyNotificationsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Notifications →
          </Link>
        </div>
      </div>

      <WorkflowFormPopover
        open={showWorkflowForm}
        onClose={() => setShowWorkflowForm(false)}
        slug={slug}
        companyId={company.id}
      />

      {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Workflow</th>
              <th className="hidden px-4 py-3 md:table-cell">Trigger</th>
              <th className="hidden px-4 py-3 lg:table-cell">Actions</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0
                    ? "No workflows yet. Create one to automate repetitive follow-ups."
                    : "No workflows match your filters."}
                </td>
              </tr>
            ) : (
              filteredRows.map((workflow) => (
                <tr key={workflow.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{workflow.name}</p>
                    <p className="text-xs text-slate-400">
                      Created {formatShortDate(workflow.createdAt)}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                    {workflowTriggerLabel(workflow.triggerType)}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                    {workflow.steps.length === 0
                      ? "No steps"
                      : workflow.steps
                          .map((step) => {
                            const label = workflowActionLabel(step.action);
                            return step.delayDays ? `${label} (+${step.delayDays}d)` : label;
                          })
                          .join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onToggle(workflow)}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        workflow.enabled
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {workflow.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-lg text-red-600 hover:text-red-700"
                        disabled={pending}
                        onClick={() => onDelete(workflow)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
