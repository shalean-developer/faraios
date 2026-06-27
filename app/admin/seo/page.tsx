import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminSeoWorkspaceLink } from "@/components/admin/admin-seo-workspace-link";
import { WorkspaceModeCallout } from "@/components/admin/workspace-mode-callout";
import { listSeoProjectsAdmin } from "@/lib/services/seo/project-service";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  riseStatCardClassName,
  riseTableClassName,
  riseTableHeadRowClassName,
} from "@/lib/ui/rise-dashboard-styles";

export const metadata = {
  title: "SEO Platform — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const projects = await listSeoProjectsAdmin();
  const admin = tryCreateAdminClient();

  const companyScores: {
    company_id: string;
    name: string;
    slug: string | null;
    avg_score: number;
    pages: number;
  }[] = [];
  if (admin.ok) {
    const { data: companies } = await admin.client
      .from("companies")
      .select("id, name, slug")
      .limit(100);
    for (const c of companies ?? []) {
      const { data: pages } = await admin.client
        .from("seo_pages")
        .select("seo_score")
        .eq("company_id", c.id);
      const scores = (pages ?? []).map((p) => p.seo_score ?? 0).filter((s) => s > 0);
      companyScores.push({
        company_id: c.id,
        name: c.name,
        slug: c.slug ?? null,
        avg_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        pages: pages?.length ?? 0,
      });
    }
    companyScores.sort((a, b) => b.avg_score - a.avg_score);
  }

  return (
    <AdminPageShell
      title="SEO Platform V10"
      description="Cross-tenant SEO health overview. Per-business SEO work should happen in workspace mode."
    >
      <WorkspaceModeCallout featureLabel="SEO management" className="mb-4" />
      <div className="grid gap-4 sm:grid-cols-3">
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

      <section className={riseTableClassName}>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">All SEO projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={riseTableHeadRowClassName}>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">GSC</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Workspace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
                    <td className="px-4 py-3">
                      <AdminSeoWorkspaceLink companySlug={p.company_slug} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {companyScores.length > 0 ? (
        <section className={riseTableClassName}>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Company SEO scores</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {companyScores.slice(0, 20).map((c) => (
              <li key={c.company_id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-medium text-slate-900">{c.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-600">
                    {c.avg_score}/100 — {c.pages} page(s)
                  </span>
                  <AdminSeoWorkspaceLink companySlug={c.slug} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AdminPageShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={riseStatCardClassName}>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
