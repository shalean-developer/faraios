import type { HostingProvider } from "./types";
import { vercelHostingProvider } from "./vercel";

const CF_CNAME_TARGET =
  process.env.FARAIOS_CLOUDFLARE_PAGES_CNAME ?? "faraios.pages.dev";

/**
 * Cloudflare Pages provider — DNS instructions and placeholder API hooks.
 * Full Cloudflare API integration can be added when CF_API_TOKEN is configured.
 */
export const cloudflarePagesHostingProvider: HostingProvider = {
  slug: "cloudflare_pages",
  displayName: "Cloudflare Pages",

  async createProject(input) {
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      return {
        ok: true,
        providerProjectId: `cf-local-${input.companyId.slice(0, 8)}`,
      };
    }
    // Delegate to manual mode until CF Pages API is wired
    return vercelHostingProvider.createProject(input);
  },

  async connectDomain(input) {
    const domain = input.domain.toLowerCase();
    return {
      ok: true,
      providerDomainId: domain,
      dnsRecords: [
        {
          recordType: "CNAME",
          host: domain.startsWith("www.") ? "www" : "@",
          value: CF_CNAME_TARGET,
        },
      ],
    };
  },

  async deploySite(input) {
    return {
      ok: true,
      providerDeploymentId: `cf-deploy-${Date.now()}`,
      url: input.sourceUrl ?? "",
      status: "live",
    };
  },

  async checkStatus() {
    return {};
  },

  async removeDomain() {
    return { ok: true };
  },
};
