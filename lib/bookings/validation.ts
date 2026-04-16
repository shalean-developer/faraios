export type BookingPayload = {
  customerName: string;
  service: string;
  bookingDateIso: string;
};

export function buildBookingPayload(input: {
  customerName: string;
  service: string;
  bookingDate: string;
}): { ok: true; data: BookingPayload } | { ok: false; error: string } {
  const customerName = input.customerName.trim();
  const service = input.service.trim();

  if (!customerName || !service || !input.bookingDate) {
    return { ok: false, error: "Name, service, and date are required." };
  }

  const bookingAt = new Date(input.bookingDate);
  if (Number.isNaN(bookingAt.getTime())) {
    return { ok: false, error: "Invalid booking date." };
  }

  return {
    ok: true,
    data: {
      customerName,
      service,
      bookingDateIso: bookingAt.toISOString(),
    },
  };
}
