import { redirect } from "next/navigation";

import { companyBillingPath } from "@/lib/paths/company";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy route — redirects to the V7 billing page. */
export default async function CompanySubscriptionRedirectPage({
  params,
  searchParams,
}: Props) {
  const { company } = await params;
  const query = await searchParams;
  const slug = decodeURIComponent(company);

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
  }

  const suffix = qs.toString();
  redirect(`${companyBillingPath(slug)}${suffix ? `?${suffix}` : ""}`);
}
