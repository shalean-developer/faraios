"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bug,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Smile,
  Tag,
  Upload,
  User,
  X,
} from "lucide-react";

import { deleteTaskAction, updateTaskAction } from "@/app/actions/tasks";
import { ManageLabelsModal } from "@/components/company/event-calendar/manage-labels-modal";
import { TaskFormPopover } from "@/components/company/task-form-popover";
import type { CalendarLabel } from "@/lib/calendar/event-labels";
import { taskSourceLabel, taskSourcePath } from "@/lib/tasks/source-links";
import {
  buildTaskNumericIds,
  DEFAULT_TASK_LABELS,
  displayStatusLabel,
  formatTaskDeadline,
  getInitials,
  getKanbanColumn,
  getMilestone,
  getRelatedToTitle,
  getTaskLabel,
  getTaskNumericId,
  isTaskOverdue,
  KANBAN_COLUMNS,
  readTaskLabels,
  rowAccentClass,
  statusBadgeClass,
  type TaskLabel,
  type TaskView,
  writeTaskLabels,
} from "@/lib/tasks/rise-task-ui";
import type { TaskListSummary } from "@/lib/services/tasks";
import type { CompanyMember } from "@/lib/services/team";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";
import type { CompanyTask } from "@/types/v6-engine";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function ToolbarButton({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50",
        active && "border-[#5c86f2] bg-[#eef2ff] text-[#4a6fd8]",
        className
      )}
    >
      {children}
    </button>
  );
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600",
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}

function PriorityIcon({ priority }: { priority: CompanyTask["priority"] }) {
  if (priority === "urgent" || priority === "high") {
    return <ArrowUp className="h-3.5 w-3.5 text-[#fb923c]" strokeWidth={2} />;
  }
  if (priority === "low") {
    return <ArrowDown className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />;
  }
  return <Smile className="h-3.5 w-3.5 text-[#a855f7]" strokeWidth={2} />;
}

function TaskLabelBadge({ label }: { label: TaskLabel }) {
  return (
    <span
      className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium text-white"
      style={{ backgroundColor: label.color }}
    >
      {label.name}
    </span>
  );
}

function PaginationFooter({
  pageSize,
  onPageSizeChange,
  page,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  onPageChange,
}: {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  page: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>
          {totalItems === 0 ? "0" : `${pageStart + 1}-${pageEnd}`} / {totalItems}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onPageChange(num)}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm",
              page === num
                ? "border-[#5a8dee] bg-[#5a8dee] text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  numericId,
  label,
  assigneeName,
  onEdit,
}: {
  task: CompanyTask;
  numericId: number;
  label: TaskLabel;
  assigneeName: string;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300"
    >
      <div className="flex items-start gap-2">
        <Avatar name={assigneeName} className="h-7 w-7" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">
            {numericId}. {task.title}
          </p>
          <div className="mt-2">
            <TaskLabelBadge label={label} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <PriorityIcon priority={task.priority} />
            {task.dueDate ? (
              <span className="text-[11px] text-slate-400">{formatTaskDeadline(task.dueDate)}</span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function GanttView({
  tasks,
  labels,
  idMap,
  memberNames,
  focusDate,
}: {
  tasks: CompanyTask[];
  labels: TaskLabel[];
  idMap: Map<string, number>;
  memberNames: Map<string, string>;
  focusDate: Date;
}) {
  const days = useMemo(() => {
    const start = new Date(focusDate);
    start.setDate(start.getDate() - 3);
    return Array.from({ length: 14 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [focusDate]);

  const dayKey = (date: Date) => date.toISOString().slice(0, 10);

  return (
    <div className="overflow-x-auto p-4 sm:p-5">
      <div className="min-w-[960px]">
        <div
          className="grid border-b border-slate-200"
          style={{ gridTemplateColumns: "16rem repeat(14, minmax(3.5rem, 1fr))" }}
        >
          <div className="border-r border-slate-200 px-3 py-2 text-xs font-medium text-slate-500">
            Task
          </div>
          {days.map((day) => (
            <div
              key={dayKey(day)}
              className="border-r border-slate-200 px-1 py-2 text-center text-[11px] text-slate-500 last:border-r-0"
            >
              {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          ))}
        </div>

        {tasks.length === 0 ? (
          <p className="px-3 py-12 text-center text-sm text-slate-500">No tasks to display.</p>
        ) : (
          tasks.map((task) => {
            const label = getTaskLabel(task, labels);
            const start = task.createdAt.slice(0, 10);
            const end = task.dueDate ?? start;
            const startIndex = days.findIndex((day) => dayKey(day) >= start);
            const endIndex = days.findIndex((day) => dayKey(day) >= end);
            const from = startIndex >= 0 ? startIndex : 0;
            const to = endIndex >= 0 ? endIndex : days.length - 1;
            const span = Math.max(to - from + 1, 1);
            const assignee = task.assignedTo
              ? memberNames.get(task.assignedTo) ?? "Unassigned"
              : "Unassigned";

            return (
              <div
                key={task.id}
                className="grid border-b border-slate-100"
                style={{ gridTemplateColumns: "16rem repeat(14, minmax(3.5rem, 1fr))" }}
              >
                <div className="border-r border-slate-100 px-3 py-3 text-sm text-slate-700">
                  <p className="truncate font-medium">
                    {getTaskNumericId(task.id, idMap)}. {task.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">{assignee}</p>
                </div>
                <div
                  className="relative col-span-14 grid items-center"
                  style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
                >
                  {days.map((day, index) => (
                    <div
                      key={`${task.id}-${dayKey(day)}`}
                      className="h-10 border-r border-slate-50 last:border-r-0"
                      style={{ gridColumn: index + 1 }}
                    />
                  ))}
                  <div
                    className="absolute inset-y-2 z-10 flex items-center rounded px-2 text-[11px] font-medium text-white"
                    style={{
                      backgroundColor: label.color,
                      left: `calc(${(from / 14) * 100}% + 4px)`,
                      width: `calc(${(span / 14) * 100}% - 8px)`,
                    }}
                  >
                    <span className="truncate">{task.title}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function RiseTasksDashboard({
  slug,
  company,
  tasks: initialTasks,
  members,
  currentUserId,
}: {
  slug: string;
  company: CompanyWithIndustry;
  tasks: CompanyTask[];
  summary?: TaskListSummary;
  members: CompanyMember[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [view, setView] = useState<TaskView>("list");
  const [rows, setRows] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [bugFilter, setBugFilter] = useState(false);
  const [labels, setLabels] = useState<TaskLabel[]>(DEFAULT_TASK_LABELS);
  const [showManageLabels, setShowManageLabels] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<CompanyTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [ganttFocus] = useState(() => new Date());

  useEffect(() => {
    setRows(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setLabels(readTaskLabels(slug));
  }, [slug]);

  const memberNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      map.set(member.user_id, member.full_name?.trim() || member.email);
    }
    return map;
  }, [members]);

  const idMap = useMemo(() => buildTaskNumericIds(rows), [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((task) => {
      if (task.status === "cancelled") return false;
      if (myTasksOnly && currentUserId && task.assignedTo !== currentUserId) return false;
      if (bugFilter && getTaskLabel(task, labels).id !== "bug") return false;
      if (!query) return true;
      return (
        task.title.toLowerCase().includes(query) ||
        (task.description ?? "").toLowerCase().includes(query) ||
        (memberNames.get(task.assignedTo ?? "") ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, search, myTasksOnly, currentUserId, bugFilter, labels, memberNames]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const pageEnd = Math.min(pageStart + pageRows.length, filteredRows.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const kanbanGroups = useMemo(() => {
    const groups = {
      todo: [] as CompanyTask[],
      in_progress: [] as CompanyTask[],
      review: [] as CompanyTask[],
    };
    for (const task of filteredRows) {
      groups[getKanbanColumn(task)].push(task);
    }
    return groups;
  }, [filteredRows]);

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

  const onExport = () => {
    const header = ["ID", "Title", "Status", "Priority", "Due date", "Assignee"];
    const lines = filteredRows.map((task) => [
      getTaskNumericId(task.id, idMap),
      task.title,
      displayStatusLabel(task.status),
      task.priority,
      task.dueDate ?? "",
      task.assignedTo ? memberNames.get(task.assignedTo) ?? "" : "",
    ]);
    const csv = [header, ...lines]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug}-tasks.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const labelsAsCalendarLabels: CalendarLabel[] = labels;

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-800">Tasks</h1>
            <div className="mt-3 flex gap-6">
              {(
                [
                  { id: "list", label: "List" },
                  { id: "kanban", label: "Kanban" },
                  { id: "gantt", label: "Gantt" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "border-b-2 pb-2 text-sm font-medium transition",
                    view === tab.id
                      ? "border-[#5a8dee] text-[#4a6fd8]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {view === "list" ? (
              <>
                <button
                  type="button"
                  className={riseOutlineButtonClassName}
                  onClick={() => setShowManageLabels(true)}
                >
                  <Tag className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
                  Manage labels
                </button>
                <button type="button" className={cn(riseOutlineButtonClassName, "bg-slate-50")}>
                  <Upload className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
                  Import tasks
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-700"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Add multiple tasks
                </button>
              </>
            ) : null}
            <button type="button" className={riseOutlineButtonClassName} onClick={openCreateForm}>
              <Plus className="h-4 w-4 text-[#5a8dee]" strokeWidth={1.75} />
              Add task
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
          <ToolbarButton onClick={() => router.refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton>
            <Filter className="h-3.5 w-3.5" />
            Filters
          </ToolbarButton>
          <ToolbarButton>
            <Plus className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton active={!myTasksOnly && !bugFilter}>All tasks</ToolbarButton>
          <ToolbarButton
            active={bugFilter}
            onClick={() => {
              setBugFilter((value) => !value);
              setPage(1);
            }}
          >
            <Bug className="h-3.5 w-3.5 text-[#a855f7]" />
            Bug
          </ToolbarButton>
          <ToolbarButton>
            <Clock className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton>
            <ArrowUp className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={myTasksOnly}
            onClick={() => {
              setMyTasksOnly((value) => !value);
              setPage(1);
            }}
          >
            <User className="h-3.5 w-3.5" />
            My tasks
          </ToolbarButton>
          <ToolbarButton onClick={onExport} className="px-3">
            Excel
          </ToolbarButton>
          <ToolbarButton onClick={() => window.print()} className="px-3">
            <Printer className="h-3.5 w-3.5" />
            Print
          </ToolbarButton>
          <div className="ml-auto flex min-w-[180px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
            <input
              type="search"
              placeholder="Search"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {view === "list" ? (
          <div className="flex items-center justify-end gap-4 border-b border-slate-100 px-5 py-2 text-xs text-slate-500">
            <button type="button" className={cn(myTasksOnly && "font-medium text-[#4a6fd8]")}>
              My Tasks
            </button>
            <span>Recently Updated</span>
          </div>
        ) : view === "kanban" ? (
          <div className="flex items-center justify-end border-b border-slate-100 px-5 py-2 text-xs text-slate-500">
            Recently updated
          </div>
        ) : null}

        {error ? <p className="px-5 pt-3 text-sm font-medium text-red-600">{error}</p> : null}

        {view === "list" ? (
          <>
            <div className="md:hidden">
              {pageRows.length === 0 ? (
                <p className="px-4 py-16 text-center text-sm text-slate-500 sm:px-6">
                  No tasks match your filters.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pageRows.map((task) => {
                    const label = getTaskLabel(task, labels);
                    const assignee = task.assignedTo
                      ? memberNames.get(task.assignedTo) ?? "Team member"
                      : "Unassigned";
                    const overdue = isTaskOverdue(task);

                    return (
                      <li
                        key={task.id}
                        className={cn("border-l-4 px-4 py-4 sm:px-6", rowAccentClass(task))}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => openEditForm(task)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="font-medium text-[#4a6fd8]">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{assignee}</p>
                          </button>
                          <span
                            className={cn(
                              "shrink-0 rounded px-2 py-1 text-xs font-medium",
                              statusBadgeClass(task.status)
                            )}
                          >
                            {displayStatusLabel(task.status)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <TaskLabelBadge label={label} />
                          {task.dueDate ? (
                            <span
                              className={cn(
                                "text-xs text-slate-500",
                                overdue && "font-medium text-red-600"
                              )}
                            >
                              Due {formatTaskDeadline(task.dueDate)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1200px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                    <th className="w-10 px-4 py-3 sm:px-5">
                      <input type="checkbox" aria-label="Select all" />
                    </th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Start date</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Milestone</th>
                    <th className="px-4 py-3">Related to</th>
                    <th className="px-4 py-3">Assigned to</th>
                    <th className="px-4 py-3">Collaborators</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 sm:pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-16 text-center text-slate-500">
                        No tasks match your filters.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((task) => {
                      const label = getTaskLabel(task, labels);
                      const assignee = task.assignedTo
                        ? memberNames.get(task.assignedTo) ?? "Team member"
                        : "Unassigned";
                      const sourceHref = taskSourcePath(slug, task.sourceType, task.sourceId);
                      const relatedTitle = getRelatedToTitle(task, taskSourceLabel(task.sourceType));
                      const overdue = isTaskOverdue(task);

                      return (
                        <tr
                          key={task.id}
                          className={cn("border-l-4 transition hover:bg-slate-50/80", rowAccentClass(task))}
                        >
                          <td className="px-4 py-3 sm:px-5">
                            <input type="checkbox" aria-label={`Select task ${task.title}`} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {getTaskNumericId(task.id, idMap)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openEditForm(task)}
                              className="font-medium text-[#4a6fd8] hover:underline"
                            >
                              {task.title}
                            </button>
                            <div className="mt-1">
                              <TaskLabelBadge label={label} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatTaskDeadline(task.createdAt.slice(0, 10))}
                          </td>
                          <td className={cn("px-4 py-3", overdue && "font-medium text-red-600")}>
                            {formatTaskDeadline(task.dueDate)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{getMilestone(task)}</td>
                          <td className="px-4 py-3">
                            {sourceHref ? (
                              <Link href={sourceHref} className="text-[#4a6fd8] hover:underline">
                                {relatedTitle}
                              </Link>
                            ) : (
                              <span className="text-[#4a6fd8]">{relatedTitle}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={assignee} className="h-6 w-6" />
                              <span className="text-slate-700">{assignee}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">—</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded px-2.5 py-1 text-xs font-medium",
                                statusBadgeClass(task.status)
                              )}
                            >
                              {displayStatusLabel(task.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 sm:pr-5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditForm(task)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                                aria-label="Edit task"
                              >
                                <Pencil className="h-4 w-4" strokeWidth={1.75} />
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => onDelete(task)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
                                aria-label="Delete task"
                              >
                                <X className="h-4 w-4" strokeWidth={1.75} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              page={currentPage}
              totalPages={totalPages}
              totalItems={filteredRows.length}
              pageStart={pageStart}
              pageEnd={pageEnd}
              onPageChange={setPage}
            />
          </>
        ) : null}

        {view === "kanban" ? (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 md:p-5">
            {KANBAN_COLUMNS.map((column) => {
              const items = kanbanGroups[column.key];
              return (
                <div key={column.key} className="min-w-0">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-700">
                      {column.label}{" "}
                      <span className="text-slate-400">({items.length})</span>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {items.length === 0 ? (
                      <p className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400">
                        No tasks
                      </p>
                    ) : (
                      items.map((task) => {
                        const assignee = task.assignedTo
                          ? memberNames.get(task.assignedTo) ?? "Unassigned"
                          : "Unassigned";
                        return (
                          <KanbanCard
                            key={task.id}
                            task={task}
                            numericId={getTaskNumericId(task.id, idMap)}
                            label={getTaskLabel(task, labels)}
                            assigneeName={assignee}
                            onEdit={() => openEditForm(task)}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {view === "gantt" ? (
          <GanttView
            tasks={filteredRows}
            labels={labels}
            idMap={idMap}
            memberNames={memberNames}
            focusDate={ganttFocus}
          />
        ) : null}
      </div>

      <TaskFormPopover
        open={showTaskForm}
        onClose={closeTaskForm}
        slug={slug}
        companyId={company.id}
        members={members}
        task={editingTask}
      />

      <ManageLabelsModal
        open={showManageLabels}
        onClose={() => setShowManageLabels(false)}
        slug={slug}
        onLabelsChange={(next) => setLabels(next as TaskLabel[])}
        defaultLabels={DEFAULT_TASK_LABELS as CalendarLabel[]}
        readLabels={(value) => readTaskLabels(value) as CalendarLabel[]}
        writeLabels={(value, next) => writeTaskLabels(value, next as TaskLabel[])}
      />
    </div>
  );
}
