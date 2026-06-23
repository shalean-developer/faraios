import { notFound } from "next/navigation";

import { listBookingActivities } from "@/lib/services/booking-activities";
import { getBookingById } from "@/lib/services/bookings";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listCompanyMembers } from "@/lib/services/team";

import { CompanyBookingDetailClient } from "./company-booking-detail-client";

type Props = { params: Promise<{ company: string; id: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyBookingDetailPage({ params }: Props) {
  const { company, id } = await params;
  const slug = decodeURIComponent(company);
  const bookingId = decodeURIComponent(id);

  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const [booking, staff, activities] = await Promise.all([
    getBookingById(row.id, bookingId),
    listCompanyMembers(row.id),
    listBookingActivities(row.id, bookingId),
  ]);

  if (!booking) notFound();

  return (
    <CompanyBookingDetailClient
      slug={slug}
      company={row}
      booking={booking}
      staff={staff}
      activities={activities}
    />
  );
}
