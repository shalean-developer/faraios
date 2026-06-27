import { describe, expect, it } from "vitest";

import { formatDateEnZA, formatDateTimeEnZA } from "../lib/format/dates";

describe("formatDateEnZA", () => {
  it("formats with a fixed timezone for hydration-safe output", () => {
    expect(formatDateEnZA("2026-07-25T11:23:34.870817+00:00")).toBe("2026/07/25");
  });
});

describe("formatDateTimeEnZA", () => {
  it("formats with a fixed locale and timezone for hydration-safe output", () => {
    expect(formatDateTimeEnZA("2026-06-26T20:49:58.000Z")).toBe("2026/06/26, 22:49:58");
  });
});
