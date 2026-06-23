import { redirect } from "next/navigation";

import { companyQuoteRequestsPath } from "@/lib/paths/company";

type Props = { params: Promise<{ company: string }> };

export default async function CompanyQuotesPage({ params }: Props) {
  const { company } = await params;
  redirect(companyQuoteRequestsPath(decodeURIComponent(company)));
}
