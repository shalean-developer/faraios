import { describe, expect, it } from "vitest";

import { isPleskDuplicateDomainError } from "@/lib/hosting/plesk/pleskSubscriptions";

describe("isPleskDuplicateDomainError", () => {
  it("detects Plesk duplicate domain errors", () => {
    expect(
      isPleskDuplicateDomainError(
        "Incorrect name teamedlick.co.za. This domain name already exists."
      )
    ).toBe(true);
    expect(isPleskDuplicateDomainError("Permission denied")).toBe(false);
  });
});
