export type PleskConnectionStatus =
  | "connected"
  | "authentication_failed"
  | "api_disabled"
  | "wrong_endpoint"
  | "permission_denied"
  | "network_error";

export type PleskCredentials = {
  url: string;
  xmlEndpoint: string;
  username: string;
  secret: string;
  serverId?: string | null;
  defaultNameservers: string[];
};

export type PleskXmlResult<T = Record<string, unknown>> =
  | { ok: true; data: T; rawXml: string }
  | { ok: false; error: string; errorCode?: string; connectionStatus?: PleskConnectionStatus; rawXml?: string };

export type PleskServicePlan = {
  id: string;
  name: string;
  storageLimitGb?: number;
  bandwidthLimitGb?: number;
  domainLimit?: number;
  subdomainLimit?: number;
  mailboxLimit?: number;
  ftpAccountLimit?: number;
  databaseLimit?: number;
};

export type PleskCustomer = {
  id: string;
  login: string;
  name?: string;
};

export type PleskSubscription = {
  id: string;
  domainName: string;
  customerId?: string;
  planName?: string;
  status?: string;
};

export type PleskDnsRecord = {
  id?: string;
  type: string;
  host: string;
  value: string;
  priority?: number;
  ttl?: number;
};

export type PleskMailbox = {
  id?: string;
  name: string;
  email: string;
  quotaMb?: number;
};

export type PleskFtpAccount = {
  id?: string;
  name: string;
  homeDirectory?: string;
};

export type PleskDatabase = {
  id?: string;
  name: string;
  type?: string;
  dbUser?: string;
};

export type PleskUsageStats = {
  diskUsedMb: number;
  bandwidthUsedMb: number;
  mailboxesUsed: number;
  databasesUsed: number;
  ftpAccountsUsed: number;
};

export type PleskLogContext = {
  companyId?: string;
  orderId?: string;
  serviceId?: string;
  serverId?: string;
  action: string;
};
