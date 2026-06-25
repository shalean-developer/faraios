import { listSeoProjectsAdmin } from "@/lib/services/seo/project-service";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "SEO Platform — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const projects = await listSeoProjectsAdmin();
  const admin = tryCreateAdminClient();

  const companyScores: { company_id: string; name: string; avg_score: number; pages: number }[] = [];
  if (admin.ok) {
    const { data: companies } = await admin.client.from("companies").select("id, name").limit(100);
    for (const c of companies ?? []) {
      const { data: pages } = await admin.client
        .from("seo_pages")
        .select("seo_score")
        .eq("company_id", c.id);
      const scores = (pages ?? []).map((p) => p.seo_score ?? 0).filter((s) => s > 0);
      companyScores.push({
        company_id: c.id,
        name: c.name,
        avg_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        pages: pages?.length ?? 0,
      });
    }
    companyScores.sort((a, b) => b.avg_score - a.avg_score);
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Infrastructure</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">SEO Platform V10</h1>
        <p className="mt-2 text-sm text-slate-500">
          Cross-tenant SEO health, projects, and crawl status.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="SEO projects" value={String(projects.length)} />
        <StatCard
          label="Avg health score"
          value={
            companyScores.length
              ? `${Math.round(companyScores.reduce((a, c) => a + c.avg_score, 0) / companyScores.length)}/100`
              : "—"
          }
        />
        <StatCard
          label="Companies tracked"
          value={String(companyScores.filter((c) => c.pages > 0).length)}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">All SEO projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">GSC</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No SEO projects yet. Projects are created when customers visit their SEO dashboard.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">{p.company_name ?? p.company_id}</td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.domain ?? "—"}</td>
                    <td className="px-4 py-3">{p.gsc_connected ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {companyScores.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Company SEO scores</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {companyScores.slice(0, 20).map((c) => (
              <li key={c.company_id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-slate-900">{c.name}</span>
                <span className="text-slate-600">
                  {c.avg_score}/100 — {c.pages} page(s)
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
