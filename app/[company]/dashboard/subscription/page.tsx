import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";

import { CompanySubscriptionClient } from "./company-subscription-client";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workspace subscription — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanySubscriptionPage({ params, searchParams }: Props) {
  const { company } = await params;
  const { payment } = await searchParams;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Workspace subscription</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your FaraiOS platform plan and monthly billing.
        </p>
      </header>

      <CompanySubscriptionClient
        slug={slug}
        company={row}
        paymentSuccess={payment === "success"}
      />
    </div>
  );
}
