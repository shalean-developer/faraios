import { renderCompanyBookingsPage } from "./load-bookings-page";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookings — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyBookingsPage({ params }: Props) {
  const { company } = await params;
  return renderCompanyBookingsPage(company, "all");
}
