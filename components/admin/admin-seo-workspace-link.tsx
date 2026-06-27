import Link from "next/link";

import { WorkspaceModeCallout } from "@/components/admin/workspace-mode-callout";
import { agencyWorkspaceHref } from "@/lib/platform/agency-workspace";
import { companySeoPath } from "@/lib/paths/company";

export function AdminSeoWorkspaceLink({
  companySlug,
}: {
  companySlug?: string | null;
}) {
  if (!companySlug) return <span className="text-slate-400">—</span>;

  const href = agencyWorkspaceHref(companySlug, companySeoPath(companySlug));

  return (
    <Link href={href} className="font-medium text-violet-700 hover:text-violet-900">
      Workspace
    </Link>
  );
}
