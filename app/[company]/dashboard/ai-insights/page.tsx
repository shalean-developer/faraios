import { notFound } from "next/navigation";

import { AiInsightsClient } from "@/components/v6/ai-insights-client";
import { getCompanyBySlug } from "@/lib/services/companies";
import { requireCompanyPermission } from "@/lib/services/company-access";
import { generateAiInsights } from "@/lib/services/ai-assistant";
import { createClient } from "@/lib/supabase/server";
import { riseCardClassName, risePageClassName } from "@/lib/ui/rise-dashboard-styles";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Smart Search — FaraiOS",
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
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="px-4 py-4 sm:px-5">
          <h1 className="text-lg font-medium text-slate-800">Smart Search</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rule-based insights and quick search across your bookings, customers, invoices, and
            leads. Optional LLM integration can be added when configured.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <AiInsightsClient companyId={row.id} insights={insights} />
      </div>
    </div>
  );
}
