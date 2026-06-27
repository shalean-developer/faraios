import Link from "next/link";
import { notFound } from "next/navigation";

import { companyDashboardPath } from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getLocalSeoSettings, seedLocalSeoFromCompany } from "@/lib/services/local-seo";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import {
  listReviewRequests,
  summarizeReviewRequests,
} from "@/lib/services/review-requests";
import { createClient } from "@/lib/supabase/server";

import { CompanyReviewsClient } from "./company-reviews-client";

export const metadata = {
  title: "Reviews — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

function AccessDenied({ slug }: { slug: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500">Please sign in to manage review requests.</p>
      <Link
        href="/auth/sign-in"
        className="mt-6 inline-block text-sm font-medium text-[#5a8dee] hover:text-[#4a6fd8]"
      >
        Go to sign in
      </Link>
      <Link
        href={companyDashboardPath(slug)}
        className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to dashboard
      </Link>
    </main>
  );
}

export default async function CompanyReviewsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AccessDenied slug={slug} />;

  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const hasAccess = await userHasCompanySlugAccess(user.id, slug);
  if (!hasAccess) return <AccessDenied slug={slug} />;

  await seedLocalSeoFromCompany(row.id, row);

  const [requests, localSeo] = await Promise.all([
    listReviewRequests(row.id),
    getLocalSeoSettings(row.id),
  ]);

  const summary = summarizeReviewRequests(requests);

  return (
    <CompanyReviewsClient
      slug={slug}
      companyId={row.id}
      companyName={row.name}
      requests={requests}
      summary={summary}
      googleReviewLink={localSeo?.google_review_link ?? null}
      autoReviewRequestEnabled={localSeo?.auto_review_request_enabled ?? false}
    />
  );
}
