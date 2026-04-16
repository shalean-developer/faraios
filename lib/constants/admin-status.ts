export const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
} as const;

export const clientProjectStatusStyles: Record<
  "Pending" | "In Progress" | "In Review" | "Completed",
  { bg: string; text: string; dot: string }
> = {
  Pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  "In Progress": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  "In Review": { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  Completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
};
