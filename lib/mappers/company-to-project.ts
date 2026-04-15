import type { CompanyWithIndustry } from "@/types/database";

export type ProjectStatus =
  | "pending"
  | "in-progress"
  | "review"
  | "completed";

export type Project = {
  id: string;
  slug: string;
  businessName: string;
  status: ProjectStatus;
  createdDate: string;
  industry: string;
  pages: string[];
  designStyle: string;
  competitors: string;
  features: string[];
  logoName?: string;
};

function formatCreatedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapPipelineStatus(
  row: CompanyWithIndustry
): Project["status"] {
  const raw = row.build_status ?? "pending";
  if (
    raw === "in-progress" ||
    raw === "review" ||
    raw === "completed"
  ) {
    return raw;
  }
  return "pending";
}

/** Maps a company row to the home SPA `Project` view (extra fields are placeholders until you add columns). */
export function companyToProject(row: CompanyWithIndustry): Project {
  return {
    id: row.id,
    slug: row.slug,
    businessName: row.name,
    status: mapPipelineStatus(row),
    createdDate: formatCreatedDate(row.created_at),
    industry: row.industries?.name ?? "—",
    pages: [],
    designStyle: "—",
    competitors: "",
    features: [],
    logoName: undefined,
  };
}
