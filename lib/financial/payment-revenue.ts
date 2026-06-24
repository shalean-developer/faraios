/**
 * Canonical revenue source for FaraiOS dashboards: paid customer_payments.
 * Booking price_cents is operational estimate only — not used for financial KPIs.
 */

export function averagePaymentCents(
  payments: { amount_cents: number }[]
): number {
  if (payments.length === 0) return 0;
  const total = payments.reduce((sum, p) => sum + p.amount_cents, 0);
  return Math.round(total / payments.length);
}

export function sumPaidPaymentsCents(
  payments: { amount_cents: number; status: string }[]
): number {
  return payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount_cents, 0);
}

export type ServicePaymentStats = {
  bookingCount: number;
  revenueCents: number;
};

/** Attribute paid revenue to services via booking.service_id on payments. */
export function aggregateServicePaymentStats(
  bookings: { id: string; service_id: string | null }[],
  payments: {
    amount_cents: number;
    status: string;
    booking_id: string | null;
  }[]
): Record<string, ServicePaymentStats> {
  const bookingService = new Map<string, string>();
  for (const booking of bookings) {
    if (booking.service_id) {
      bookingService.set(booking.id, booking.service_id);
    }
  }

  const stats: Record<string, ServicePaymentStats> = {};

  for (const booking of bookings) {
    if (!booking.service_id) continue;
    if (!stats[booking.service_id]) {
      stats[booking.service_id] = { bookingCount: 0, revenueCents: 0 };
    }
    stats[booking.service_id].bookingCount += 1;
  }

  for (const payment of payments) {
    if (payment.status !== "paid" || !payment.booking_id) continue;
    const serviceId = bookingService.get(payment.booking_id);
    if (!serviceId) continue;
    if (!stats[serviceId]) {
      stats[serviceId] = { bookingCount: 0, revenueCents: 0 };
    }
    stats[serviceId].revenueCents += payment.amount_cents;
  }

  return stats;
}

/** Top service by paid revenue (via booking linkage). */
export function topServiceByPaidRevenue(
  bookings: { id: string; service: string | null }[],
  payments: {
    amount_cents: number;
    status: string;
    booking_id: string | null;
  }[]
): { name: string; revenueCents: number } | null {
  const bookingServiceName = new Map<string, string>();
  for (const booking of bookings) {
    bookingServiceName.set(booking.id, booking.service ?? "Other");
  }

  const byService = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== "paid" || !payment.booking_id) continue;
    const name = bookingServiceName.get(payment.booking_id) ?? "Other";
    byService.set(name, (byService.get(name) ?? 0) + payment.amount_cents);
  }

  const sorted = [...byService.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  return { name: sorted[0][0], revenueCents: sorted[0][1] };
}
