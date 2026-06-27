import { promises as dns } from "dns";

import {
  buildPleskDomainDnsRecords,
  getPleskHostingTarget,
} from "@/lib/hosting/plesk/target";
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
    return {
      ok: true,
      providerDeploymentId: `plesk-deploy-${Date.now()}`,
      url: input.sourceUrl ?? "",
      status: "live",
    };
  },

  async checkStatus(input: CheckStatusInput): Promise<CheckStatusResult> {
    if (!input.domain) return {};

    const target = await getPleskHostingTarget({ companyId: input.companyId });
    if (!target) return {};

    const candidates = [input.domain.toLowerCase(), `www.${input.domain.toLowerCase()}`];
    for (const hostname of candidates) {
      try {
        const records = await dns.resolve4(hostname);
        if (records.includes(target.serverIp)) {
          return {
            verificationStatus: "verified",
            sslStatus: "pending",
          };
        }
      } catch {
        // try next hostname
      }
    }

    return { verificationStatus: "pending", sslStatus: "not_started" };
  },

  async removeDomain(_input: RemoveDomainInput): Promise<RemoveDomainResult> {
    return { ok: true };
  },
};
