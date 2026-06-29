import { describe, expect, it } from "vitest";

import {
  domainsMatchForHosting,
  hostsMatch,
  normalizeDnsHost,
  valuesMatch,
} from "@/lib/hosting/plesk/dnsSyncUtils";

describe("Plesk DNS sync utils", () => {
  it("canonicalizes apex and www hosts", () => {
    expect(normalizeDnsHost("@", "example.com")).toBe("@");
    expect(normalizeDnsHost("example.com", "example.com")).toBe("@");
    expect(normalizeDnsHost("www", "example.com")).toBe("www");
    expect(normalizeDnsHost("www.example.com", "example.com")).toBe("www");
  });

  it("canonicalizes _faraios TXT host", () => {
    expect(normalizeDnsHost("_faraios", "example.com")).toBe("_faraios");
    expect(normalizeDnsHost("_faraios.example.com", "example.com")).toBe("_faraios");
  });

  it("matches hosts across Plesk and FaraiOS formats", () => {
    expect(hostsMatch("", "@", "example.com")).toBe(true);
    expect(hostsMatch("www.example.com", "www", "example.com")).toBe(true);
    expect(hostsMatch("_faraios.example.com", "_faraios", "example.com")).toBe(true);
  });

  it("matches TXT values with optional quotes", () => {
    expect(
      valuesMatch("TXT", '"faraios-verify=abc123"', "faraios-verify=abc123")
    ).toBe(true);
    expect(valuesMatch("TXT", "faraios-verify=abc123", "faraios-verify=other")).toBe(
      false
    );
  });

  it("matches A records case-insensitively without trailing dots", () => {
    expect(valuesMatch("A", "203.0.113.10.", "203.0.113.10")).toBe(true);
  });

  it("matches domains with or without www prefix", () => {
    expect(domainsMatchForHosting("www.example.com", "example.com")).toBe(true);
    expect(domainsMatchForHosting("example.com", "WWW.EXAMPLE.COM.")).toBe(true);
    expect(domainsMatchForHosting("shop.example.com", "example.com")).toBe(false);
  });
});
