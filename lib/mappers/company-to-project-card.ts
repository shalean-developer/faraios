import type { CompanyWithIndustry } from "@/types/database";
import type { Project, ProjectStatus } from "@/types/project";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapStatus(row: CompanyWithIndustry): ProjectStatus {
  const raw = row.build_status ?? "pending";
  switch (raw) {
    case "in-progress":
      return "In Progress";
    case "review":
      return "In Review";
    case "completed":
      return "Completed";
    default:
      return "Pending";
  }
}

/** Maps a company row to the `/dashboard/projects` card model. */
export function companyToProjectCard(row: CompanyWithIndustry): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.industries?.name ?? "—",
    status: mapStatus(row),
    date: formatDate(row.created_at),
  };
}
