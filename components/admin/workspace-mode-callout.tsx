"use client";

import Link from "next/link";
import { ArrowUpRight, Shield } from "lucide-react";

import { OpenWorkspaceDialog } from "@/components/admin/open-workspace-dialog";
import { cn } from "@/lib/utils";

export function WorkspaceModeCallout({
  featureLabel,
  companyId,
  companySlug,
  companyName,
  workspaceHref,
  className,
}: {
  featureLabel: string;
  companyId?: string | null;
  companySlug?: string | null;
  companyName?: string | null;
  workspaceHref?: string | null;
  className?: string;
}) {
  const canOpenWorkspace = Boolean(companyId && companySlug && companyName);

  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700">
            <Shield className="h-3.5 w-3.5" />
            Prefer workspace mode
          </p>
          <p className="mt-1 text-sm leading-relaxed text-indigo-900/90">
            Cross-tenant {featureLabel} on the platform admin is being phased out. Open the
            business workspace to work inside a scoped, audited session with the correct agency
            tools.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {workspaceHref ? (
            <Link
              href={workspaceHref}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Open in workspace
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          {canOpenWorkspace ? (
            <OpenWorkspaceDialog
              companyId={companyId!}
              companySlug={companySlug!}
              companyName={companyName!}
              triggerLabel={workspaceHref ? "Enter workspace" : "Open workspace"}
              triggerClassName="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
