import { notFound } from "next/navigation";

import { AiInsightsClient } from "@/components/v6/ai-insights-client";
import { getCompanyBySlug } from "@/lib/services/companies";
import { generateAiInsights } from "@/lib/services/ai-assistant";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function AiInsightsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const insights = await generateAiInsights(row.id);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          AI Assistant
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Business insights & search</h1>
        <p className="mt-2 text-sm text-slate-600">
          Data-driven recommendations powered by your FaraiOS business data.
        </p>
      </header>
      <AiInsightsClient companyId={row.id} insights={insights} />
    </div>
  );
}
