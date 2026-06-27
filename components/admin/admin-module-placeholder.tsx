import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { riseCardClassName } from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";

export function AdminModulePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <AdminPageShell title={title} description={description}>
      <div className="flex items-center justify-center py-12">
        <div className={cn(riseCardClassName, "max-w-md p-8 text-center")}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Construction className="h-7 w-7 text-[#5a8dee]" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Coming in the next phase</h2>
          <p className="mt-2 text-sm text-slate-500">
            This module is part of the platform admin restructure. The navigation and routing
            are in place; detailed monitoring and management tools will ship next.
          </p>
          {phase ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#5a8dee]">
              {phase}
            </p>
          ) : null}
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5a8dee] hover:text-[#4a6fd8]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>
        </div>
      </div>
    </AdminPageShell>
  );
}
