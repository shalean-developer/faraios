import Link from "next/link";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { WorkspaceModeCallout } from "@/components/admin/workspace-mode-callout";
import { PreviewWebsiteButton } from "@/components/websites/preview-website-button";
import { agencyWorkspaceHref } from "@/lib/platform/agency-workspace";
import { companyWebsiteBuilderPath } from "@/lib/paths/company";
import { risePrimaryButtonClassName, riseTableClassName } from "@/lib/ui/rise-dashboard-styles";
import type { Website } from "@/types/database";

type WebsiteWithCompany = Website & {
  companies?: { id?: string; name?: string | null; slug?: string | null } | null;
};

export function FaraiAdminWebsites({
  websites,
}: {
  websites: WebsiteWithCompany[];
}) {
  return (
    <AdminPageShell
      title="Websites"
      description="Create and manage client websites"
      maxWidthClassName="max-w-6xl"
      actions={
        <>
          <Link href="/admin/websites/create" className={risePrimaryButtonClassName}>
            + Create Website
          </Link>
          <AdminActivityBellLink />
        </>
      }
    >
      <WorkspaceModeCallout
        featureLabel="website editing"
        className="mb-4"
      />
      <div className={riseTableClassName}>
        <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_auto_auto_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Business</span>
          <span>Client</span>
          <span>Industry</span>
          <span>Status</span>
          <span className="text-right">Legacy edit</span>
          <span className="text-right">Workspace</span>
          <span className="text-right">Preview</span>
        </div>
        {websites.length > 0 ? (
          websites.map((website) => {
            const companySlug = website.companies?.slug?.trim() ?? null;
            const workspaceHref = companySlug
              ? agencyWorkspaceHref(companySlug, companyWebsiteBuilderPath(companySlug))
              : null;

            return (
            <div
              key={website.id}
              className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_auto_auto_auto] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
            >
              <span className="font-medium text-slate-900">{website.name}</span>
              <span className="text-slate-600">{website.companies?.name ?? "—"}</span>
              <span className="text-slate-600">{website.industry}</span>
              <span className="text-slate-600">{website.status}</span>
              <span className="text-right">
                <Link
                  href={`/admin/websites/${website.id}/edit`}
                  className="font-medium text-slate-500 hover:text-slate-700"
                >
                  Legacy
                </Link>
              </span>
              <span className="text-right">
                {workspaceHref ? (
                  <Link
                    href={workspaceHref}
                    className="font-medium text-violet-700 hover:text-violet-900"
                  >
                    Builder
                  </Link>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </span>
              <span className="flex justify-end">
                <PreviewWebsiteButton websiteId={website.id} domain={website.domain} />
              </span>
            </div>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">No websites yet.</div>
        )}
      </div>
    </AdminPageShell>
  );
}
