import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin Companies — FaraiOS",
  robots: { index: false, follow: false },
};

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  subscription_status: string | null;
};

export default async function AdminCompaniesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, plan, subscription_status")
    .order("created_at", { ascending: false });

  const companies = ((data ?? []) as CompanyRow[]).filter(Boolean);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Companies
        </h1>
        <Link href="/admin" className="text-sm font-semibold text-indigo-600 hover:underline">
          Back to Admin
        </Link>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load companies: {error.message}
        </p>
      ) : companies.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          No companies found.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Subscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {companies.map((company) => (
                <tr key={company.id}>
                  <td className="px-4 py-3 text-slate-900">{company.name}</td>
                  <td className="px-4 py-3 text-slate-600">{company.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{company.plan ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {company.subscription_status ?? "inactive"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
