import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getBusinessHealthScore } from "@/lib/services/business-health";
import { riseCardClassName, risePageClassName } from "@/lib/ui/rise-dashboard-styles";
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
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="px-4 py-4 sm:px-5">
          <h1 className="text-lg font-medium text-slate-800">Performance score</h1>
          <p className="mt-1 text-sm text-slate-500">
            Composite business health across revenue, bookings, and retention.
          </p>
        </div>
      </div>

      <div className={cn(riseCardClassName, "mt-4 p-8 text-center")}>
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

      <section className="mt-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Score factors</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(health.factors).map(([key, value]) => (
            <div key={key} className={cn(riseCardClassName, "p-5")}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Recommendations</h2>
        <ul className="space-y-3">
          {health.recommendations.map((rec, i) => (
            <li
              key={i}
              className={cn(riseCardClassName, "px-4 py-3 text-sm text-slate-700")}
            >
              {rec}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
