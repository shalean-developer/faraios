import { describe, expect, it } from "vitest";

import { validateBookingAvailability } from "../lib/bookings/availability";

describe("validateBookingAvailability", () => {
  it("rejects blocked dates", () => {
    const result = validateBookingAvailability({
      bookingDateIso: "2026-06-15T10:00:00.000Z",
      blockedDates: ["2026-06-15"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not available/i);
    }
  });

  it("rejects bookings on closed days", () => {
    const result = validateBookingAvailability({
      bookingDateIso: "2026-06-14T10:00:00.000Z",
      bookingHours: {
        sun: { open: "09:00", close: "17:00", closed: true },
        mon: { open: "09:00", close: "17:00" },
        tue: { open: "09:00", close: "17:00" },
        wed: { open: "09:00", close: "17:00" },
        thu: { open: "09:00", close: "17:00" },
        fri: { open: "09:00", close: "17:00" },
        sat: { open: "09:00", close: "13:00", closed: true },
      },
    });
    expect(result.ok).toBe(false);
  });

  it("accepts bookings within open hours", () => {
    const result = validateBookingAvailability({
      bookingDateIso: "2026-06-16T10:00:00.000Z",
      bookingHours: {
        mon: { open: "09:00", close: "17:00" },
        tue: { open: "09:00", close: "17:00" },
        wed: { open: "09:00", close: "17:00" },
        thu: { open: "09:00", close: "17:00" },
        fri: { open: "09:00", close: "17:00" },
        sat: { open: "09:00", close: "13:00", closed: true },
        sun: { open: "09:00", close: "13:00", closed: true },
      },
    });
    expect(result.ok).toBe(true);
  });
});
