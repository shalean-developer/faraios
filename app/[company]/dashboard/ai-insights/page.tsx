import { notFound } from "next/navigation";

import { AiInsightsClient } from "@/components/v6/ai-insights-client";
import { getCompanyBySlug } from "@/lib/services/companies";
import { requireCompanyPermission } from "@/lib/services/company-access";
import { generateAiInsights } from "@/lib/services/ai-assistant";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Smart Search — Shalean",
  robots: { index: false, follow: false },
};

export default async function AiInsightsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const access = await requireCompanyPermission(row.id, "view_ai_insights");
  if (!access.ok) notFound();

  const insights = await generateAiInsights(row.id);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Intelligence
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Smart Search</h1>
        <p className="mt-2 text-sm text-slate-600">
          Rule-based insights and quick search across your bookings, customers, invoices, and leads.
          Optional LLM integration can be added when configured.
        </p>
      </header>
      <AiInsightsClient companyId={row.id} insights={insights} />
    </div>
  );
}
