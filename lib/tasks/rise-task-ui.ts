import type { CompanyTask } from "@/types/v6-engine";

export type TaskLabel = {
  id: string;
  name: string;
  color: string;
};

export const DEFAULT_TASK_LABELS: TaskLabel[] = [
  { id: "enhancement", name: "Enhancement", color: "#5a8dee" },
  { id: "bug", name: "Bug", color: "#ec4899" },
  { id: "design", name: "Design", color: "#22c55e" },
  { id: "feedback", name: "Feedback", color: "#14b8a6" },
];

export type TaskView = "list" | "kanban" | "gantt";

export type KanbanColumn = "todo" | "in_progress" | "review";

export const KANBAN_COLUMNS: { key: KanbanColumn; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "review", label: "Review" },
];

const STORAGE_PREFIX = "faraios.tasks.labels";

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}.${slug}`;
}

export function readTaskLabels(slug: string): TaskLabel[] {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return DEFAULT_TASK_LABELS;
    const parsed = JSON.parse(raw) as TaskLabel[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TASK_LABELS;
    return parsed.filter(
      (label) =>
        typeof label.id === "string" &&
        typeof label.name === "string" &&
        typeof label.color === "string"
    );
  } catch {
    return DEFAULT_TASK_LABELS;
  }
}

export function writeTaskLabels(slug: string, labels: TaskLabel[]): void {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(labels));
  } catch {
    // ignore
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTaskLabel(task: CompanyTask, labels: TaskLabel[]): TaskLabel {
  if (task.priority === "urgent" || task.priority === "high") {
    return labels.find((label) => label.id === "bug") ?? labels[0]!;
  }
  if (task.sourceType === "booking") {
    return labels.find((label) => label.id === "design") ?? labels[0]!;
  }
  return labels[hashString(task.id) % labels.length]!;
}

export function getKanbanColumn(task: CompanyTask): KanbanColumn {
  if (task.status === "in_progress") return "in_progress";
  if (task.status === "done") return "review";
  return "todo";
}

export function statusFromKanbanColumn(column: KanbanColumn): CompanyTask["status"] {
  if (column === "in_progress") return "in_progress";
  if (column === "review") return "done";
  return "open";
}

export function displayStatusLabel(status: CompanyTask["status"]): string {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "done":
      return "Review";
    case "cancelled":
      return "Cancelled";
    default:
      return "To do";
  }
}

export function statusBadgeClass(status: CompanyTask["status"]): string {
  switch (status) {
    case "in_progress":
      return "bg-[#5a8dee] text-white";
    case "done":
      return "bg-[#a855f7] text-white";
    case "cancelled":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-[#fb923c] text-white";
  }
}

export function rowAccentClass(task: CompanyTask): string {
  switch (task.priority) {
    case "urgent":
      return "border-l-[#ef4444]";
    case "high":
      return "border-l-[#fb923c]";
    case "medium":
      return "border-l-[#5a8dee]";
    default:
      return "border-l-[#22c55e]";
  }
}

export function formatTaskDeadline(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function isTaskOverdue(task: CompanyTask): boolean {
  if (!task.dueDate || task.status === "done" || task.status === "cancelled") return false;
  return task.dueDate < new Date().toISOString().slice(0, 10);
}

export function getTaskNumericId(taskId: string, idMap: Map<string, number>): number {
  return idMap.get(taskId) ?? 0;
}

export function buildTaskNumericIds(tasks: CompanyTask[]): Map<string, number> {
  const sorted = [...tasks].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const map = new Map<string, number>();
  sorted.forEach((task, index) => map.set(task.id, 3400 + index));
  return map;
}

export function getRelatedToTitle(
  task: CompanyTask,
  sourceLabel: string | null
): string {
  if (sourceLabel) {
    return sourceLabel
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return "General task";
}

export function getMilestone(task: CompanyTask): string {
  if (task.status === "done") return "Release";
  if (task.priority === "urgent" || task.priority === "high") return "Beta Release";
  return "—";
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
