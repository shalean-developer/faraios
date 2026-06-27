import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { listWorkflows, summarizeWorkflows } from "@/lib/services/workflow-engine";

import { CompanyAutomationsClient } from "./company-automations-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Automations — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function AutomationsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const workflows = await listWorkflows(row.id);

  return (
    <CompanyAutomationsClient
      slug={slug}
      company={row}
      workflows={workflows}
      summary={summarizeWorkflows(workflows)}
    />
  );
}
