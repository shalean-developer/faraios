import type { Booking } from "@/types/database";

export type BookingRequestType = "booking_request" | "quote_request";

export type BookingsView = "all" | "booking-requests" | "quote-requests";

export function getBookingRequestType(booking: Booking): BookingRequestType {
  if (booking.request_type === "quote_request") return "quote_request";

  const custom = booking.custom_responses?.request_type;
  if (custom === "quote_request" || custom === "quote") return "quote_request";

  return "booking_request";
}

export function filterBookingRequests(bookings: Booking[]): Booking[] {
  return bookings.filter((b) => getBookingRequestType(b) === "booking_request");
}

export function filterBookingsByView(
  bookings: Booking[],
  view: BookingsView
): Booking[] {
  if (view === "booking-requests") {
    return filterBookingRequests(bookings);
  }
  if (view === "quote-requests") {
    return bookings.filter((b) => getBookingRequestType(b) === "quote_request");
  }
  return filterBookingRequests(bookings);
}
