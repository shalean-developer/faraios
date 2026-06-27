import { describe, expect, it } from "vitest";

import { clickAnalyticsKey } from "@/lib/website-builder/click-tracking";

describe("click tracking", () => {
  it("groups clicks by label, href, and element type", () => {
    expect(
      clickAnalyticsKey({ label: "Book Now", href: "/book", element: "link" })
    ).toBe(
      clickAnalyticsKey({ label: "Book Now", href: "/book", element: "link" })
    );
    expect(
      clickAnalyticsKey({ label: "Book Now", href: "/book", element: "link" })
    ).not.toBe(
      clickAnalyticsKey({ label: "Contact", href: "/book", element: "link" })
    );
    expect(
      clickAnalyticsKey({ label: "Book Now", href: "/book", element: "link" })
    ).not.toBe(
      clickAnalyticsKey({ label: "Book Now", href: "/book", element: "button" })
    );
  });
});
