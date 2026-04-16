import Link from "next/link";

import { WebsiteContentEditor } from "@/components/websites/website-content-editor";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { createClient } from "@/lib/supabase/server";
import type { Website, WebsiteContent } from "@/types/database";

export const metadata = {
  title: "Admin Edit Website Content — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

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
  const supabase = await createClient();
  const { data: website } = await supabase.from("websites").select("*").eq("id", id).maybeSingle();
  if (!website) return <AccessDenied />;
  const typedWebsite = website as Website;

  const { data: rows } = await supabase
    .from("website_content")
    .select("*")
    .eq("website_id", typedWebsite.id);

  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", typedWebsite.client_id)
    .maybeSingle();
  const companySlug = (company as { slug?: string | null } | null)?.slug ?? "admin";

  const previewHost = typedWebsite.domain || `${typedWebsite.subdomain}.faraios.com`;
  const previewUrl = `https://${previewHost}`;

  return (
    <WebsiteContentEditor
      websiteId={typedWebsite.id}
      companySlug={companySlug}
      previewUrl={previewUrl}
      contentRows={(rows as WebsiteContent[]) ?? []}
    />
  );
}
