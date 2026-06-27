import { WebsiteApiKeysClient } from "./company-api-keys-client";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getConnectedWebsiteForCompany } from "@/lib/services/connected-websites";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";
import type { BusinessApiKeyEvent } from "@/types/website-engine";

export const metadata = {
  title: "API keys — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

export default async function CompanyWebsiteApiKeysPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-500">Sign in to manage API keys.</p>
      </main>
    );
  }

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-500">Access denied.</p>
      </main>
    );
  }

  const connected = await getConnectedWebsiteForCompany(row.id);

  const { data: keyEvents } = await supabase
    .from("business_api_key_events")
    .select("*")
    .eq("company_id", row.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <WebsiteApiKeysClient
      companyId={row.id}
      slug={slug}
      apiKey={connected?.api_key ?? null}
      apiKeyStatus={connected?.api_key_status ?? "active"}
      keyEvents={(keyEvents ?? []) as BusinessApiKeyEvent[]}
    />
  );
}
