import { promises as dns } from "dns";

import {
  buildPleskDomainDnsRecords,
  getPleskHostingTarget,
} from "@/lib/hosting/plesk/target";
import { probeDomainSslActive } from "@/lib/hosting/ssl-probe";
import type {
  CheckStatusInput,
  CheckStatusResult,
  ConnectDomainInput,
  ConnectDomainResult,
  CreateProjectInput,
  CreateProjectResult,
  DeploySiteInput,
  DeploySiteResult,
  HostingProvider,
  RemoveDomainInput,
  RemoveDomainResult,
} from "./types";

/**
 * Plesk hosting provider adapter for FaraiOS website domains.
 * Returns A-record instructions for the configured Plesk server IP.
 */
export const pleskHostingProvider: HostingProvider = {
  slug: "plesk",
  displayName: "Plesk",

  async createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
    return {
      ok: true,
      providerProjectId: `plesk-${input.companyId.slice(0, 8)}`,
    };
  },

  async connectDomain(input: ConnectDomainInput): Promise<ConnectDomainResult> {
    const target = await getPleskHostingTarget({
      companyId: input.companyId,
      serverId: input.serverId,
    });

    if (!target) {
      return {
        ok: false,
        error:
          "Plesk server IP is not configured. Set FARAIOS_PLESK_SERVER_IP or configure a default hosting server in Admin → Hosting.",
      };
    }

    return {
      ok: true,
      providerDomainId: input.domain.toLowerCase(),
      dnsRecords: buildPleskDomainDnsRecords(input.domain, target),
    };
  },

  async deploySite(input: DeploySiteInput): Promise<DeploySiteResult> {
    const origin =
      process.env.FARAIOS_PLESK_APP_ORIGIN?.trim() ||
      (process.env.FARAIOS_PLESK_PROXY_ENABLED?.trim().toLowerCase() !== "false"
        ? `http://127.0.0.1:${process.env.FARAIOS_PLESK_APP_PORT?.trim() || process.env.PORT?.trim() || "3000"}`
        : "");

    return {
      ok: true,
      providerDeploymentId: `plesk-deploy-${Date.now()}`,
      url: input.sourceUrl ?? origin,
      status: "live",
    };
  },

  async checkStatus(input: CheckStatusInput): Promise<CheckStatusResult> {
    if (!input.domain) return {};

    const target = await getPleskHostingTarget({ companyId: input.companyId });
    if (!target) return {};

    const domain = input.domain.toLowerCase();
    const candidates = [domain, domain.startsWith("www.") ? domain : `www.${domain}`];
    let dnsVerified = false;

    for (const hostname of candidates) {
      try {
        const records = await dns.resolve4(hostname);
        if (records.includes(target.serverIp)) {
          dnsVerified = true;
          break;
        }
      } catch {
        // try next hostname
      }
    }

    if (!dnsVerified) {
      return { verificationStatus: "pending", sslStatus: "not_started" };
    }

    const sslActive = await probeDomainSslActive(domain);

    return {
      verificationStatus: "verified",
      sslStatus: sslActive ? "active" : "pending",
    };
  },

  async removeDomain(_input: RemoveDomainInput): Promise<RemoveDomainResult> {
    return { ok: true };
  },
};
