import Link from "next/link";

import { AdminWebsiteEditPage } from "@/components/websites/admin-website-edit-page";
import { getAdminQueryClient, isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import type { Website, WebsiteContent } from "@/types/database";

export const metadata = {
  title: "Admin Edit Website Content — Shalean",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type WebsiteWithCompany = Website & {
  companies: {
    id: string;
    name: string;
    slug: string;
    listed_in_marketplace: boolean;
    marketplace_summary: string | null;
    marketplace_location: string | null;
    marketplace_featured: boolean;
  } | null;
};

function AccessDenied() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin access required</h1>
      <Link href="/admin/websites" className="mt-6 inline-block text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to websites
      </Link>
    </main>
  );
}

export default async function AdminEditWebsitePage({ params }: Props) {
  if (!(await isCurrentUserPlatformAdmin())) return <AccessDenied />;

  const { id } = await params;
  const supabase = await getAdminQueryClient();
  const { data: website } = await supabase
    .from("websites")
    .select(
      "*, companies(id, name, slug, listed_in_marketplace, marketplace_summary, marketplace_location, marketplace_featured)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!website) return <AccessDenied />;

  const typedWebsite = website as WebsiteWithCompany;
  const company = typedWebsite.companies;

  const { data: rows } = await supabase
    .from("website_content")
    .select("*")
    .eq("website_id", typedWebsite.id);

  return (
    <AdminWebsiteEditPage
      website={{
        id: typedWebsite.id,
        name: typedWebsite.name,
        industry: typedWebsite.industry,
        template: typedWebsite.template,
        status: typedWebsite.status,
        domain: typedWebsite.domain,
        subdomain: typedWebsite.subdomain,
        seoTitle: typedWebsite.seo_title ?? null,
        seoDescription: typedWebsite.seo_description ?? null,
        seoKeywords: typedWebsite.seo_keywords ?? null,
      }}
      company={company}
      marketplace={
        company
          ? {
              listed: Boolean(company.listed_in_marketplace),
              summary: company.marketplace_summary,
              location: company.marketplace_location,
              featured: Boolean(company.marketplace_featured),
              slug: company.slug,
            }
          : null
      }
      contentRows={(rows as WebsiteContent[]) ?? []}
    />
  );
}
