import { describe, expect, it } from "vitest";

import { getDefaultHostingProviderSlug } from "@/lib/hosting/constants";
import {
  buildPleskDomainDnsRecords,
  describePleskDnsInstructions,
} from "@/lib/hosting/plesk/target";

describe("Plesk hosting target", () => {
  it("defaults website domains to the plesk provider", () => {
    expect(getDefaultHostingProviderSlug()).toBe("plesk");
  });

  it("builds A records for apex and www", () => {
    const records = buildPleskDomainDnsRecords("www.example.com", {
      serverIp: "203.0.113.10",
      serverHostname: "so1.cloud-wex.com",
      nameservers: ["ns1.example.com", "ns2.example.com"],
      serverId: "server-1",
    });

    expect(records).toEqual([
      { recordType: "A", host: "@", value: "203.0.113.10" },
      { recordType: "A", host: "www", value: "203.0.113.10" },
    ]);
  });

  it("describes Plesk DNS instructions with server IP", () => {
    const text = describePleskDnsInstructions({
      serverIp: "203.0.113.10",
      serverHostname: "so1.cloud-wex.com",
      nameservers: ["ns1.example.com"],
      serverId: null,
    });

    expect(text).toContain("203.0.113.10");
    expect(text).toContain("ns1.example.com");
  });
});
