"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { deleteWorkflowAction, toggleWorkflowAction } from "@/app/actions/automations";
import { WorkflowFormPopover } from "@/components/company/workflow-form-popover";
import {
  workflowActionLabel,
  workflowTriggerLabel,
} from "@/lib/automations/constants";
import {
  companyNotificationsPath,
  companyTasksPath,
} from "@/lib/paths/company";
import type { WorkflowListSummary } from "@/lib/services/workflow-engine";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
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
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-800">Automations</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Automate follow-ups when bookings complete, invoices are paid, leads arrive, and more.
            </p>
          </div>
          <button
            type="button"
            className={
              showWorkflowForm ? riseOutlineButtonClassName : risePrimaryButtonClassName
            }
            aria-expanded={showWorkflowForm}
            aria-haspopup="dialog"
            onClick={() => setShowWorkflowForm((open) => !open)}
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            New workflow
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-0.5 font-semibold text-slate-800">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm sm:w-72"
              placeholder="Search workflows..."
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All workflows</option>
              <option value="enabled">Enabled only</option>
              <option value="disabled">Disabled only</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href={companyTasksPath(slug)}
              className="font-medium text-[#4a6fd8] hover:text-[#3a5fc8]"
            >
              Tasks →
            </Link>
            <Link
              href={companyNotificationsPath(slug)}
              className="font-medium text-[#4a6fd8] hover:text-[#3a5fc8]"
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

        {error ? (
          <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
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
                        <button
                          type="button"
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          disabled={pending}
                          onClick={() => onDelete(workflow)}
                          aria-label="Delete workflow"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
