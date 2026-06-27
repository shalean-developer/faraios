import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getAdvancedReports } from "@/lib/services/advanced-reports";
import { riseCardClassName, risePageClassName } from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyReportsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const reports = await getAdvancedReports(row.id);

  return (
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="px-4 py-4 sm:px-5">
          <h1 className="text-lg font-medium text-slate-800">Advanced reporting</h1>
          <p className="mt-1 text-sm text-slate-500">
            Revenue, booking, customer, and marketing reports across your business.
          </p>
        </div>
      </div>

      <ReportCategory title="Revenue reports" sections={reports.revenue} />
      <ReportCategory title="Booking reports" sections={reports.bookings} />
      <ReportCategory title="Customer reports" sections={reports.customers} />
      <ReportCategory title="Marketing reports" sections={reports.marketing} />
    </div>
  );
}

function ReportCategory({
  title,
  sections,
}: {
  title: string;
  sections: { title: string; rows: { label: string; value: string }[] }[];
}) {
  if (sections.length === 0) return null;
  return (
    <section className="mt-4">
      <h2 className="mb-3 text-sm font-medium text-slate-700">{title}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className={cn(riseCardClassName, "overflow-hidden")}>
            <h3 className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700">
              {section.title}
            </h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {section.rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                      No data yet.
                    </td>
                  </tr>
                ) : (
                  section.rows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 text-slate-600">{row.label}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {row.value}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}
