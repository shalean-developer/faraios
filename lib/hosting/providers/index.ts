import { cloudflarePagesHostingProvider } from "./cloudflare-pages";
import type { HostingProvider, HostingProviderSlug } from "./types";
import { vercelHostingProvider } from "./vercel";

export type {
  CheckStatusResult,
  DeploymentEnvironment,
  DeploymentStatus,
  DnsRecordInstruction,
  DnsRecordType,
  DomainSslStatus,
  DomainVerificationStatus,
  HostingProvider,
  HostingProviderSlug,
} from "./types";

const providers: Record<HostingProviderSlug, HostingProvider> = {
  vercel: vercelHostingProvider,
  cloudflare_pages: cloudflarePagesHostingProvider,
  netlify: vercelHostingProvider, // placeholder
  aws: vercelHostingProvider, // placeholder
};

export function getHostingProvider(slug: HostingProviderSlug | string | null): HostingProvider {
  if (slug && slug in providers) {
    return providers[slug as HostingProviderSlug];
  }
  return vercelHostingProvider;
}

export function listHostingProviders(): HostingProvider[] {
  return [vercelHostingProvider, cloudflarePagesHostingProvider];
}
