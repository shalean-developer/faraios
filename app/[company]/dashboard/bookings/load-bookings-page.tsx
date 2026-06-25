import { notFound } from "next/navigation";

import { CompanyBookingsClient } from "@/app/[company]/dashboard/bookings/company-bookings-client";
import type { BookingsView } from "@/lib/bookings/request-type";
import { ensureBookingFormForCompany } from "@/lib/services/booking-forms";
import { listBookingsForCompany } from "@/lib/services/bookings";
import { listServicesForCompany } from "@/lib/services/company-services";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listCustomersForCompany } from "@/lib/services/customers";
import {
  listNotifications,
  summarizeNotifications,
} from "@/lib/services/notifications";
import { listQuotesForCompany } from "@/lib/services/quotes";
import { createClient } from "@/lib/supabase/server";

export async function renderCompanyBookingsPage(
  companySlug: string,
  view: BookingsView = "all"
) {
  const slug = decodeURIComponent(companySlug);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const industrySlug = row.industries?.slug ?? null;

  const [bookings, services, quotes, customers, bookingForm] = await Promise.all([
    listBookingsForCompany(row.id),
    listServicesForCompany(row.id, { activeOnly: true }),
    listQuotesForCompany(row.id),
    listCustomersForCompany(row.id),
    view === "booking-requests"
      ? ensureBookingFormForCompany({ companyId: row.id, industrySlug })
      : Promise.resolve(null),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userDisplayName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    (user?.email ? user.email.split("@")[0]! : "there");

  const notifications = user ? await listNotifications(row.id, user.id, 8) : [];
  const { unread: unreadCount } = summarizeNotifications(notifications);

  return (
    <CompanyBookingsClient
      slug={slug}
      company={row}
      bookings={bookings}
      services={services}
      quotes={quotes}
      customers={customers}
      bookingForm={bookingForm}
      view={view}
      userDisplayName={userDisplayName}
      notifications={notifications}
      unreadCount={unreadCount}
    />
  );
}