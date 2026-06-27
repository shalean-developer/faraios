import { notFound } from "next/navigation";
import { CompanyHostingOrderClient } from "@/components/hosting/company-hosting-order-client";
import { listActiveHostingPlans } from "@/lib/services/hosting-automation";
import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompanyHostingOrderPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const plans = await listActiveHostingPlans();

  return (
    <CompanyHostingOrderClient
      slug={slug}
      company={row}
      plans={plans}
      billingEmail={row.primary_contact_email ?? user.email ?? null}
    />
  );
}
