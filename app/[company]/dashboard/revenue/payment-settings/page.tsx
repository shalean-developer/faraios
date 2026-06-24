import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { getPaymentSettingsForCompany } from "@/lib/services/payment-settings";
import { createClient } from "@/lib/supabase/server";

import { CompanyPaymentSettingsClient } from "./company-payment-settings-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment settings — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyPaymentSettingsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const settings = await getPaymentSettingsForCompany(row.id);

  return (
    <CompanyPaymentSettingsClient slug={slug} company={row} settings={settings} />
  );
}
