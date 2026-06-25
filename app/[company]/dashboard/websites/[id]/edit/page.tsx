import Link from "next/link";

import { WebsiteContentEditor } from "@/components/websites/website-content-editor";
import { companyDashboardPath } from "@/lib/paths/company";
import { createClient } from "@/lib/supabase/server";
import type { Website, WebsiteContent } from "@/types/database";

export const metadata = {
  title: "Edit Website Content — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string; id: string }> };

function AccessDenied({ slug }: { slug: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500">
        You do not have permission to edit this website.
      </p>
      <Link
        href={companyDashboardPath(slug)}
        className="mt-6 inline-block text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to dashboard
      </Link>
    </main>
  );
}

export default async function CompanyEditWebsitePage({ params }: Props) {
  const { company, id } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AccessDenied slug={slug} />;

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (websiteError || !website) return <AccessDenied slug={slug} />;

  const typedWebsite = website as Website;

  const { data: membership } = await supabase
    .from("memberships")
    .select("id,companies(slug)")
    .eq("company_id", typedWebsite.client_id)
    .eq("user_id", user.id)
    .maybeSingle();

  type MembershipRow = { companies?: { slug?: string | null } | { slug?: string | null }[] | null };
  const typedMembership = (membership as MembershipRow | null) ?? null;
  const companySlug = Array.isArray(typedMembership?.companies)
    ? typedMembership?.companies?.[0]?.slug ?? null
    : typedMembership?.companies?.slug ?? null;

  if (!membership || !companySlug || companySlug !== slug) {
    return <AccessDenied slug={slug} />;
  }

  const { data: rows } = await supabase
    .from("website_content")
    .select("*")
    .eq("website_id", typedWebsite.id);

  const previewHost = typedWebsite.domain || `${typedWebsite.subdomain}.faraios.com`;
  const previewUrl = `https://${previewHost}`;

  return (
    <WebsiteContentEditor
      websiteId={typedWebsite.id}
      companySlug={companySlug}
      previewUrl={previewUrl}
      previewPath={`/preview/${typedWebsite.id}`}
      websiteIndustry={typedWebsite.industry}
      websiteTemplate={typedWebsite.template}
      contentRows={(rows as WebsiteContent[]) ?? []}
    />
  );
}
