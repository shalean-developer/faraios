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

import { FARAIOS_CNAME_TARGET, getFaraiosVercelConfig } from "@/lib/hosting/constants";

const VERCEL_CNAME_TARGET = FARAIOS_CNAME_TARGET;

function vercelApiUrl(path: string): string {
  const teamId = getFaraiosVercelConfig()?.teamId ?? process.env.FARAIOS_VERCEL_TEAM_ID?.trim();
  if (!teamId) return `https://api.vercel.com${path}`;
  const separator = path.includes("?") ? "&" : "?";
  return `https://api.vercel.com${path}${separator}teamId=${encodeURIComponent(teamId)}`;
}

function resolveVercelProjectId(input: ConnectDomainInput): string {
  return getFaraiosVercelConfig()?.projectId ?? input.providerProjectId;
}

/**
 * Vercel hosting provider adapter.
 * Uses provider API when VERCEL_TOKEN is set; otherwise returns DNS instructions
 * for manual setup (same as existing hosting dashboard copy).
 */
export const vercelHostingProvider: HostingProvider = {
  slug: "vercel",
  displayName: "Vercel",

  async createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      return {
        ok: true,
        providerProjectId: `local-${input.companyId.slice(0, 8)}`,
      };
    }

    try {
      const res = await fetch("https://api.vercel.com/v10/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: input.name, framework: "nextjs" }),
      });
      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || !data.id) {
        return { ok: false, error: data.error?.message ?? "Failed to create Vercel project." };
      }
      return { ok: true, providerProjectId: data.id };
    } catch {
      return { ok: false, error: "Could not reach Vercel API." };
    }
  },

  async connectDomain(input: ConnectDomainInput): Promise<ConnectDomainResult> {
    const token = process.env.VERCEL_TOKEN;
    const domain = input.domain.toLowerCase();

    if (token) {
      try {
        const projectId = resolveVercelProjectId(input);
        const res = await fetch(
          vercelApiUrl(`/v10/projects/${encodeURIComponent(projectId)}/domains`),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: domain }),
          }
        );
        const data = (await res.json()) as {
          name?: string;
          verification?: { type?: string; domain?: string; value?: string }[];
          error?: { message?: string };
        };
        if (!res.ok) {
          return { ok: false, error: data.error?.message ?? "Failed to add domain to Vercel." };
        }

        const txt = data.verification?.find((v) => v.type === "TXT");
        const dnsRecords = [
          {
            recordType: "CNAME" as const,
            host: domain.startsWith("www.") ? "www" : "@",
            value: VERCEL_CNAME_TARGET,
          },
          ...(txt?.value
            ? [{ recordType: "TXT" as const, host: "_vercel", value: txt.value }]
            : []),
        ];

        return {
          ok: true,
          providerDomainId: data.name ?? domain,
          dnsRecords,
        };
      } catch {
        return { ok: false, error: "Could not reach Vercel API." };
      }
    }

    return {
      ok: true,
      providerDomainId: domain,
      dnsRecords: [
        {
          recordType: "CNAME",
          host: domain.startsWith("www.") ? "www" : "@",
          value: VERCEL_CNAME_TARGET,
        },
      ],
    };
  },

  async deploySite(input: DeploySiteInput): Promise<DeploySiteResult> {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      return {
        ok: true,
        providerDeploymentId: `local-deploy-${Date.now()}`,
        url: input.sourceUrl ?? "",
        status: "live",
      };
    }

    try {
      const res = await fetch(
        `https://api.vercel.com/v13/deployments?projectId=${input.providerProjectId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: input.providerProjectId,
            target: input.environment === "production" ? "production" : "preview",
          }),
        }
      );
      const data = (await res.json()) as {
        id?: string;
        url?: string;
        readyState?: string;
        error?: { message?: string };
      };
      if (!res.ok || !data.id) {
        return { ok: false, error: data.error?.message ?? "Deployment failed." };
      }

      const status =
        data.readyState === "READY"
          ? "live"
          : data.readyState === "ERROR"
            ? "failed"
            : "building";

      return {
        ok: true,
        providerDeploymentId: data.id,
        url: data.url ? `https://${data.url}` : "",
        status,
      };
    } catch {
      return { ok: false, error: "Could not reach Vercel API." };
    }
  },

  async checkStatus(input: CheckStatusInput): Promise<CheckStatusResult> {
    const token = process.env.VERCEL_TOKEN;
    if (!token || !input.providerDeploymentId) {
      return {};
    }

    try {
      const res = await fetch(
        `https://api.vercel.com/v13/deployments/${input.providerDeploymentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = (await res.json()) as {
        readyState?: string;
        url?: string;
        errorMessage?: string;
      };
      if (!res.ok) return {};

      const deploymentStatus =
        data.readyState === "READY"
          ? "live"
          : data.readyState === "ERROR"
            ? "failed"
            : data.readyState === "QUEUED"
              ? "queued"
              : "building";

      return {
        deploymentStatus,
        url: data.url ? `https://${data.url}` : null,
        buildError: data.errorMessage ?? null,
      };
    } catch {
      return {};
    }
  },

  async removeDomain(input: RemoveDomainInput): Promise<RemoveDomainResult> {
    const token = process.env.VERCEL_TOKEN;
    if (!token) return { ok: true };

    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${input.providerProjectId}/domains/${input.providerDomainId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } };
        return { ok: false, error: data.error?.message ?? "Failed to remove domain." };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach Vercel API." };
    }
  },
};
