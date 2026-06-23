import { Navbar } from "@/components/Navbar";
import { getCompanyBySlug } from "@/lib/services/companies";
import {
  getHostingSubscriptionForCompany,
  listHostingPaymentsForCompany,
} from "@/lib/services/hosting";
import { notFound } from "next/navigation";

import { CompanyHostingClient } from "./company-hosting-client";

type Props = {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ plan?: string; payment?: string }>;
};

export const dynamic = "force-dynamic";

export default async function CompanyHostingPage({ params, searchParams }: Props) {
  const { company } = await params;
  const { plan, payment } = await searchParams;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const subscription = await getHostingSubscriptionForCompany(row.id);
  const payments = await listHostingPaymentsForCompany(row.id);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar />
      <main>
        <CompanyHostingClient
          slug={slug}
          company={row}
          subscription={subscription}
          payments={payments}
          initialPlan={plan}
          paymentSuccess={payment === "success"}
        />
      </main>
    </div>
  );
}
