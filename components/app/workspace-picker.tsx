import Link from "next/link";

import { companyDashboardPath } from "@/lib/paths/company";
import type { UserCompany } from "@/types/database";

export function WorkspacePicker({ companies }: { companies: UserCompany[] }) {
  if (companies.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No workspaces yet</h2>
        <p className="mt-2 text-sm text-slate-600">Complete onboarding to create your first workspace.</p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Start onboarding
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {companies.map((company) => (
        <li key={company.id}>
          <Link
            href={companyDashboardPath(company.slug)}
            className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-violet-300 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Workspace</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{company.name}</h2>
            <p className="mt-2 text-sm text-slate-500">/{company.slug}/dashboard</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
