import { notFound } from "next/navigation";

import { listBookingsForCompany } from "@/lib/services/bookings";
import { listServicesForCompany } from "@/lib/services/company-services";
import { getCompanyBySlug } from "@/lib/services/companies";

import { CompanyBookingsClient } from "./company-bookings-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookings — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyBookingsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const [bookings, services] = await Promise.all([
    listBookingsForCompany(row.id),
    listServicesForCompany(row.id, { activeOnly: true }),
  ]);

  return (
    <CompanyBookingsClient
      slug={slug}
      company={row}
      bookings={bookings}
      services={services}
    />
  );
}
