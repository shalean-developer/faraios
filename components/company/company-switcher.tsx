"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

import { companyDashboardPath } from "@/lib/paths/company";
import type { UserCompany } from "@/types/database";
import { cn } from "@/lib/utils";

export function CompanySwitcher({
  currentSlug,
  companies,
  variant = "sidebar",
}: {
  currentSlug: string;
  companies: UserCompany[];
  variant?: "sidebar" | "dropdown-only";
}) {
  const pathname = usePathname() ?? "";

  if (companies.length <= 1) {
    return null;
  }

  const suffixMatch = pathname.match(/^\/[^/]+\/dashboard(\/.*)?$/);
  const subPath = suffixMatch?.[1] ?? "";

  return (
    <details className="group relative">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600",
          variant === "sidebar" ? "h-7 w-7 shrink-0" : "gap-2 px-3 py-2 text-xs"
        )}
        aria-label="Switch workspace"
      >
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" />
        {variant === "dropdown-only" ? (
          <span className="truncate">Switch workspace</span>
        ) : null}
      </summary>
      <div className="absolute left-0 top-full z-30 mt-1 min-w-[220px] max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        {companies.map((company) => {
          const href = `${companyDashboardPath(company.slug)}${subPath}`;
          const isActive = company.slug === currentSlug;

          return (
            <Link
              key={company.id}
              href={href}
              className={cn(
                "block truncate px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-slate-100 font-medium text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {company.name}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
