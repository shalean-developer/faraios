import { notFound, redirect } from "next/navigation";

import { companyBillingPath } from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{
    plan?: string;
    payment?: string;
    reference?: string;
    trxref?: string;
    tab?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CompanyHostingPage({ params, searchParams }: Props) {
  const { company } = await params;
  const query = await searchParams;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  redirect(
    companyBillingPath(slug, {
      tab: "hosting",
      plan: query.plan,
      payment: query.payment,
      reference: query.reference ?? query.trxref,
    })
  );
}
