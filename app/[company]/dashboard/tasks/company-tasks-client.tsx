"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { deleteTaskAction, updateTaskAction } from "@/app/actions/tasks";
import { TaskFormPopover } from "@/components/company/task-form-popover";
import { Button } from "@/components/ui/button";
import {
  companyAutomationsPath,
  companyNotificationsPath,
  companyTeamPath,
} from "@/lib/paths/company";
import type { TaskListSummary } from "@/lib/services/tasks";
import type { CompanyMember } from "@/lib/services/team";
import { taskSourceLabel, taskSourcePath } from "@/lib/tasks/source-links";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";
import type { CompanyTask } from "@/types/v6-engine";

const STATUS_OPTIONS = ["open", "in_progress", "done", "cancelled"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const;

type StatusFilter = "all" | CompanyTask["status"];
type PriorityFilter = "all" | CompanyTask["priority"];

function priorityClass(priority: string): string {
  switch (priority) {
    case "urgent":
      return "bg-red-50 text-red-700";
    case "high":
      return "bg-orange-50 text-orange-700";
    case "medium":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function statusClass(status: string): string {
  switch (status) {
    case "done":
      return "bg-emerald-50 text-emerald-700";
    case "in_progress":
      return "bg-violet-50 text-violet-700";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function formatShortDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA");
}

function isOverdue(task: CompanyTask): boolean {
  if (!task.dueDate || task.status === "done" || task.status === "cancelled") return false;
  return task.dueDate < new Date().toISOString().slice(0, 10);
}

export function CompanyTasksClient({
  slug,
  company,
  tasks: initialTasks,
  summary,
  members,
}: {
  slug: string;
  company: CompanyWithIndustry;
  tasks: CompanyTask[];
  summary: TaskListSummary;
  members: CompanyMember[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<CompanyTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialTasks);
  }, [initialTasks]);

  const memberNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      map.set(member.user_id, member.full_name?.trim() || member.email);
    }
    return map;
  }, [members]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (!query) return true;

      return (
        task.title.toLowerCase().includes(query) ||
        (task.description ?? "").toLowerCase().includes(query) ||
        (task.sourceType ?? "").toLowerCase().includes(query) ||
        (memberNames.get(task.assignedTo ?? "") ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter, priorityFilter, memberNames]);

  const openCreateForm = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const openEditForm = (task: CompanyTask) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const closeTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const onStatusChange = (taskId: string, status: CompanyTask["status"]) => {
    setError(null);
    startTransition(async () => {
      const result = await updateTaskAction({
        taskId,
        companyId: company.id,
        companySlug: slug,
        status,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onDelete = (task: CompanyTask) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTaskAction({
        taskId: task.id,
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
    { label: "Total tasks", value: String(summary.total) },
    { label: "Open", value: String(summary.open) },
    { label: "In progress", value: String(summary.inProgress) },
    { label: "Overdue", value: String(summary.overdue) },
  ];

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Track follow-ups from bookings, leads, customers, and automations.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-xl"
          variant={showTaskForm && !editingTask ? "outline" : "default"}
          aria-expanded={showTaskForm && !editingTask}
          aria-haspopup="dialog"
          onClick={() =>
            showTaskForm && !editingTask ? closeTaskForm() : openCreateForm()
          }
        >
          New task
        </Button>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-72"
            placeholder="Search tasks..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All priorities</option>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={companyAutomationsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Automations →
          </Link>
          <Link
            href={companyNotificationsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Notifications →
          </Link>
          <Link
            href={companyTeamPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Team →
          </Link>
        </div>
      </div>

      <TaskFormPopover
        open={showTaskForm}
        onClose={closeTaskForm}
        slug={slug}
        companyId={company.id}
        members={members}
        task={editingTask}
      />

      {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Task</th>
              <th className="hidden px-4 py-3 md:table-cell">Assignee</th>
              <th className="hidden px-4 py-3 lg:table-cell">Due</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0
                    ? "No tasks yet. Create one manually or set up an automation."
                    : "No tasks match your filters."}
                </td>
              </tr>
            ) : (
              filteredRows.map((task) => {
                const sourceHref = taskSourcePath(slug, task.sourceType, task.sourceId);
                const sourceLabel = taskSourceLabel(task.sourceType);
                const overdue = isOverdue(task);

                return (
                  <tr key={task.id}>
                    <td className="px-4 py-3">
                      <p
                        className={cn(
                          "font-medium text-slate-900",
                          task.status === "done" && "text-slate-400 line-through"
                        )}
                      >
                        {task.title}
                      </p>
                      {task.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {task.description}
                        </p>
                      ) : null}
                      {sourceLabel ? (
                        <p className="mt-1 text-xs text-slate-400">
                          From{" "}
                          {sourceHref ? (
                            <Link
                              href={sourceHref}
                              className="text-violet-700 hover:text-violet-900"
                            >
                              {sourceLabel}
                            </Link>
                          ) : (
                            sourceLabel
                          )}
                        </p>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {task.assignedTo
                        ? memberNames.get(task.assignedTo) ?? "Team member"
                        : "Unassigned"}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className={cn(overdue ? "font-medium text-red-600" : "text-slate-600")}>
                        {formatShortDate(task.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          priorityClass(task.priority)
                        )}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.status}
                        disabled={pending}
                        onChange={(e) =>
                          onStatusChange(task.id, e.target.value as CompanyTask["status"])
                        }
                        className={cn(
                          "rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold capitalize",
                          statusClass(task.status)
                        )}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-lg"
                          onClick={() => openEditForm(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-lg text-red-600 hover:text-red-700"
                          disabled={pending}
                          onClick={() => onDelete(task)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
