export type HostingPlanRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  storage_limit_gb: number;
  bandwidth_limit_gb: number;
  email_account_limit: number;
  database_limit: number;
  domain_limit: number;
  ssl_included: boolean;
  backup_option: string;
  plesk_service_plan: string | null;
  plesk_plan_id: string | null;
  subdomain_limit: number;
  ftp_account_limit: number;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
};

export type HostingServerRow = {
  id: string;
  name: string;
  hostname: string;
  plesk_url: string;
  xml_api_endpoint: string | null;
  api_username: string | null;
  api_secret_encrypted?: string | null;
  has_api_secret?: boolean;
  api_type: string;
  is_default: boolean;
  is_active: boolean;
  default_nameservers: string[];
  last_connection_status: string | null;
  last_connection_at: string | null;
  last_connection_message: string | null;
  notes: string | null;
};

export type HostingOrderStatus =
  | "pending"
  | "paid"
  | "provisioning"
  | "active"
  | "failed"
  | "cancelled";

export type HostingOrderRow = {
  id: string;
  company_id: string;
  plan_id: string;
  domain_name: string;
  domain_type: "new" | "existing" | "transfer";
  billing_cycle: "monthly" | "yearly";
  status: HostingOrderStatus;
  invoice_id: string | null;
  payment_status: string;
  provisioning_status: string;
  server_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  hosting_plans?: HostingPlanRow;
};

export type HostingInvoiceStatus =
  | "draft"
  | "unpaid"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";

export type HostingInvoiceRow = {
  id: string;
  invoice_number: string;
  company_id: string;
  order_id: string | null;
  service_id: string | null;
  amount_cents: number;
  tax_cents: number;
  currency: string;
  status: HostingInvoiceStatus;
  due_date: string;
  paid_at: string | null;
  payment_provider: string | null;
  paystack_reference: string | null;
  created_at: string;
};

export type HostingServiceStatus =
  | "active"
  | "suspended"
  | "terminated"
  | "pending"
  | "failed";

export type HostingServiceRow = {
  id: string;
  company_id: string;
  order_id: string | null;
  invoice_id: string | null;
  plan_id: string;
  domain_name: string;
  server_id: string | null;
  plesk_subscription_id: string | null;
  plesk_customer_id: string | null;
  plesk_domain_id: string | null;
  username: string | null;
  status: HostingServiceStatus;
  billing_cycle: string;
  next_due_date: string | null;
  suspended_at: string | null;
  terminated_at: string | null;
  control_panel_url: string | null;
  created_at: string;
  hosting_plans?: HostingPlanRow;
};

export type HostingProvisioningLogRow = {
  id: string;
  company_id: string | null;
  order_id: string | null;
  service_id: string | null;
  server_id: string | null;
  action: string;
  status: string;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
};

export type HostingDomainRow = {
  id: string;
  company_id: string;
  service_id: string | null;
  domain_name: string;
  domain_type: string;
  nameservers: string[];
  dns_status: string;
  expiry_date: string | null;
  renewal_status: string;
};

export type HostingSupportTicketRow = {
  id: string;
  company_id: string;
  service_id: string | null;
  subject: string;
  department: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AdminHostingSettings = {
  pleskUrl: string;
  pleskUsername: string;
  hasPleskSecret: boolean;
  xmlApiEndpoint: string;
  defaultServerId: string | null;
  defaultNameservers: string[];
  welcomeEmailTemplate: string;
  configured: boolean;
  source: "env" | "db" | "none";
  apiType: "xml" | "rest" | "unknown";
  lastConnectionStatus: string | null;
  lastConnectionAt?: string | null;
  lastConnectionMessage?: string | null;
};

export type HostingDnsRecordRow = {
  id: string;
  company_id: string;
  service_id: string | null;
  domain_name: string;
  record_type: string;
  host: string;
  value: string;
  priority: number | null;
  ttl: number;
  plesk_record_id: string | null;
  status: string;
};

export type HostingMailboxRow = {
  id: string;
  company_id: string;
  service_id: string;
  email_address: string;
  mailbox_name: string;
  quota_mb: number;
  status: string;
};

export type HostingFtpAccountRow = {
  id: string;
  company_id: string;
  service_id: string;
  username: string;
  home_directory: string | null;
  status: string;
};

export type HostingDatabaseRow = {
  id: string;
  company_id: string;
  service_id: string;
  db_name: string;
  db_user: string | null;
  db_type: string;
  status: string;
};

export type HostingServicePlanRow = {
  id: string;
  server_id: string;
  plesk_plan_id: string;
  name: string;
  storage_limit_gb: number | null;
  bandwidth_limit_gb: number | null;
  domain_limit: number | null;
  subdomain_limit: number | null;
  mailbox_limit: number | null;
  ftp_account_limit: number | null;
  database_limit: number | null;
  is_active: boolean;
};
