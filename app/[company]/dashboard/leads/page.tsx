import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { listLeadsForCompany } from "@/lib/services/leads";
import { listCompanyMembers } from "@/lib/services/team";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";

import { CompanyLeadsClient } from "./company-leads-client";

export const metadata = {
  title: "Leads — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

function AccessDenied({ slug }: { slug: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500">Please sign in to manage leads.</p>
      <Link
        href="/auth/sign-in"
        className="mt-6 inline-block text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        Go to sign in
      </Link>
      <Link
        href={`/${encodeURIComponent(slug)}/dashboard/growth`}
        className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to growth
      </Link>
    </main>
  );
}

export default async function CompanyLeadsPage({ params }: Props) {
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

  const [leads, members] = await Promise.all([
    listLeadsForCompany(row.id),
    listCompanyMembers(row.id),
  ]);

  return (
    <CompanyLeadsClient
      slug={slug}
      companyId={row.id}
      leads={leads}
      members={members}
    />
  );
}
