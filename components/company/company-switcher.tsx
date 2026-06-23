"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

import { companyDashboardPath } from "@/lib/paths/company";
import type { UserCompany } from "@/types/database";

export function CompanySwitcher({
  currentSlug,
  companies,
}: {
  currentSlug: string;
  companies: UserCompany[];
}) {
  const pathname = usePathname() ?? "";

  if (companies.length <= 1) {
    return null;
  }

  const suffixMatch = pathname.match(/^\/[^/]+\/dashboard(\/.*)?$/);
  const subPath = suffixMatch?.[1] ?? "";

  return (
    <details className="group relative mt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white">
        <span className="truncate">Switch workspace</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      </summary>
      <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
        {companies.map((company) => {
          const href = `${companyDashboardPath(company.slug)}${subPath}`;
          const isActive = company.slug === currentSlug;

          return (
            <Link
              key={company.id}
              href={href}
              className={`block truncate px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-violet-600/20 font-semibold text-violet-200"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {company.name}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
