import { renderCompanyBookingsPage } from "../load-bookings-page";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Booking requests — Shalean",
  robots: { index: false, follow: false },
};

export default async function CompanyBookingRequestsPage({ params }: Props) {
  const { company } = await params;
  return renderCompanyBookingsPage(company, "booking-requests");
}
