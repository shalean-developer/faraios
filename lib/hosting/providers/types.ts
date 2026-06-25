export type HostingProviderSlug = "vercel" | "cloudflare_pages" | "netlify" | "aws";

export type DeploymentEnvironment = "preview" | "production";

export type DeploymentStatus =
  | "queued"
  | "building"
  | "live"
  | "failed"
  | "cancelled";

export type DomainSslStatus = "not_started" | "pending" | "active" | "failed";

export type DomainVerificationStatus = "pending" | "verified" | "failed";

export type DnsRecordType = "CNAME" | "A" | "TXT";

export type DnsRecordInstruction = {
  recordType: DnsRecordType;
  host: string;
  value: string;
};

export type CreateProjectInput = {
  name: string;
  companyId: string;
};

export type CreateProjectResult = {
  ok: true;
  providerProjectId: string;
} | { ok: false; error: string };

export type ConnectDomainInput = {
  providerProjectId: string;
  domain: string;
};

export type ConnectDomainResult = {
  ok: true;
  providerDomainId: string;
  dnsRecords: DnsRecordInstruction[];
} | { ok: false; error: string };

export type DeploySiteInput = {
  providerProjectId: string;
  environment: DeploymentEnvironment;
  sourceUrl?: string;
};

export type DeploySiteResult = {
  ok: true;
  providerDeploymentId: string;
  url: string;
  status: DeploymentStatus;
} | { ok: false; error: string };

export type CheckStatusInput = {
  providerProjectId?: string;
  providerDeploymentId?: string;
  providerDomainId?: string;
  domain?: string;
};

export type CheckStatusResult = {
  deploymentStatus?: DeploymentStatus;
  sslStatus?: DomainSslStatus;
  verificationStatus?: DomainVerificationStatus;
  buildError?: string | null;
  url?: string | null;
};

export type RemoveDomainInput = {
  providerProjectId: string;
  providerDomainId: string;
};

export type RemoveDomainResult = { ok: true } | { ok: false; error: string };

/** Provider abstraction for FaraiOS-hosted websites. */
export type HostingProvider = {
  slug: HostingProviderSlug;
  displayName: string;
  createProject(input: CreateProjectInput): Promise<CreateProjectResult>;
  connectDomain(input: ConnectDomainInput): Promise<ConnectDomainResult>;
  deploySite(input: DeploySiteInput): Promise<DeploySiteResult>;
  checkStatus(input: CheckStatusInput): Promise<CheckStatusResult>;
  removeDomain(input: RemoveDomainInput): Promise<RemoveDomainResult>;
};
