import { describe, expect, it } from "vitest";
import { buildBookingPayload } from "../lib/bookings/validation";

describe("buildBookingPayload", () => {
  it("creates normalized payload for valid booking input", () => {
    const result = buildBookingPayload({
      customerName: "  Jane Doe  ",
      service: "  Website Consultation  ",
      bookingDate: "2026-04-20T10:30",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.customerName).toBe("Jane Doe");
    expect(result.data.service).toBe("Website Consultation");
    expect(result.data.bookingDateIso).toContain("2026-04-20T");
  });

  it("rejects invalid booking date", () => {
    const result = buildBookingPayload({
      customerName: "Jane",
      service: "Consultation",
      bookingDate: "not-a-date",
    });

    expect(result).toEqual({ ok: false, error: "Invalid booking date." });
  });
});
