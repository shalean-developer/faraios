import Link from "next/link";
import { notFound } from "next/navigation";

import { companyDashboardPath } from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listCompanySupportTickets } from "@/lib/services/company-platform-ops";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";

import { CompanySupportClient } from "./company-support-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Support — Shalean",
  robots: { index: false, follow: false },
};

function AccessDenied({ slug }: { slug: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500">Please sign in to view support tickets.</p>
      <Link href="/auth/sign-in" className="mt-6 inline-block text-sm font-medium text-violet-700">
        Go to sign in
      </Link>
      <Link href={companyDashboardPath(slug)} className="mt-3 block text-sm font-medium text-slate-600">
        ← Back to dashboard
      </Link>
    </main>
  );
}

export default async function CompanySupportPage({ params }: Props) {
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

  const tickets = await listCompanySupportTickets(row.id);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <CompanySupportClient slug={slug} company={row} tickets={tickets} />
    </div>
  );
}
