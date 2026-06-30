import { describe, expect, it } from "vitest";

import {
  buildExternalDnsGuidance,
  buildExternalDnsOverview,
  pendingDnsRecordsForGuidance,
  type DnsRecordForGuidance,
} from "@/lib/hosting/external-dns-guidance";

describe("external DNS guidance", () => {
  const externalGuidance = buildExternalDnsGuidance({
    publicNameservers: ["ns1.allanuxweb.co.za", "ns2.allanuxweb.co.za"],
    pleskNameservers: ["ns1.cloud-wex.com"],
    serverIp: "104.238.222.122",
  });

  it("hides overview when external DNS records are verified", () => {
    const guidanceMap = { "domain-1": externalGuidance };
    const dnsByDomain: Record<string, DnsRecordForGuidance[]> = {
      "domain-1": [
        { record_type: "A", host: "@", value: "104.238.222.122", status: "verified" },
        { record_type: "TXT", host: "_faraios", value: "faraios-verify=abc", status: "verified" },
      ],
    };

    expect(pendingDnsRecordsForGuidance(dnsByDomain["domain-1"])).toHaveLength(0);
    expect(buildExternalDnsOverview(guidanceMap, dnsByDomain)).toBeNull();
  });

  it("shows overview when external DNS still has pending records", () => {
    const guidanceMap = { "domain-1": externalGuidance };
    const dnsByDomain: Record<string, DnsRecordForGuidance[]> = {
      "domain-1": [
        { record_type: "A", host: "@", value: "104.238.222.122", status: "verified" },
        { record_type: "TXT", host: "_faraios", value: "faraios-verify=abc", status: "pending" },
      ],
    };

    expect(buildExternalDnsOverview(guidanceMap, dnsByDomain)).toContain("external DNS");
    expect(buildExternalDnsOverview(guidanceMap, dnsByDomain)).toContain("ns1.allanuxweb.co.za");
  });
});
