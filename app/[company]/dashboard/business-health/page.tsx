import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getBusinessHealthScore } from "@/lib/services/business-health";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function BusinessHealthPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const health = await getBusinessHealthScore(row.id);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Business Health
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Performance score</h1>
      </header>

      <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Business Health
        </p>
        <p
          className={cn(
            "mt-2 text-6xl font-bold",
            health.score >= 80
              ? "text-emerald-600"
              : health.score >= 60
                ? "text-amber-600"
                : "text-red-600"
          )}
        >
          {health.score}/100
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Score factors</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(health.factors).map(([key, value]) => (
            <div
              key={key}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Recommendations</h2>
        <ul className="space-y-3">
          {health.recommendations.map((rec, i) => (
            <li
              key={i}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
            >
              {rec}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
