import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getAdvancedReports } from "@/lib/services/advanced-reports";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyReportsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const reports = await getAdvancedReports(row.id);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Reports</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Advanced reporting</h1>
        <p className="mt-2 text-sm text-slate-600">
          Revenue, booking, customer, and marketing reports across your business.
        </p>
      </header>

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
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold text-slate-900">{title}</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
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
