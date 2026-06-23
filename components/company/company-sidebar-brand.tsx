import Link from "next/link";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { companyDashboardPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";

import { CompanySwitcher } from "./company-switcher";
import type { UserCompany } from "@/types/database";

export function CompanySidebarBrand({
  slug,
  companyName,
  companies = [],
  collapsed = false,
}: {
  slug: string;
  companyName: string;
  companies?: UserCompany[];
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <div className="flex shrink-0 justify-center border-b border-slate-800 px-2 py-3">
        <Link
          href={companyDashboardPath(slug)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
          aria-label="Workspace home"
          title={companyName}
        >
          F
        </Link>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-slate-800 px-3 py-3">
      <Link
        href={companyDashboardPath(slug)}
        className="inline-flex rounded-lg bg-white px-2 py-1.5 transition-opacity hover:opacity-90"
        aria-label="Workspace home"
      >
        <FaraiLogo size="sm" priority imageClassName="max-w-[108px]" />
      </Link>
      <p className="mt-2 text-xs font-semibold leading-snug text-white" title={companyName}>
        {companyName}
      </p>
      <CompanySwitcher currentSlug={slug} companies={companies} />
    </div>
  );
}
