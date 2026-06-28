import { createAdminClient } from "@/lib/supabase/admin";
import { createHostingAccount } from "@/lib/hosting/plesk/provisioning";
import { getPleskCredentials } from "@/lib/hosting/plesk/config";
import { addPleskDnsRecord } from "@/lib/hosting/plesk/pleskDns";
import { provisionCompanyWebsiteDomain } from "@/lib/services/hosting-domain";
import { normalizeDomain, verifyWebsiteDomain } from "@/lib/services/website-domains";
import {
  notifyHostingAccountCreated,
  notifyHostingOrderReceived,
  notifyHostingPaymentSuccessful,
  notifyHostingProvisioningFailedAdmin,
  notifyInvoiceCreated,
} from "@/lib/services/hosting-notifications";
import { activateHostingSubscription } from "@/lib/billing/hosting-subscription-payment";
import type {
  HostingInvoiceRow,
  HostingOrderRow,
  HostingPlanRow,
  HostingServiceRow,
} from "@/types/hosting-automation";

function invoiceNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-H-${ts}-${rand}`;
}

function addBillingPeriod(from: Date, cycle: "monthly" | "yearly"): Date {
  const next = new Date(from);
  if (cycle === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setDate(next.getDate() + 30);
  }
  return next;
}

export async function listActiveHostingPlans(): Promise<HostingPlanRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hosting_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    const { hostingPlans } = await import("@/lib/data/hosting");
    return hostingPlans.map((p, i) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      monthly_price_cents: p.monthly_price * 100,
      yearly_price_cents: p.monthly_price * 100 * 10,
      storage_limit_gb: p.storage_gb,
      bandwidth_limit_gb: p.bandwidth_limit_gb,
      email_account_limit: 5,
      database_limit: 5,
      domain_limit: p.sites_limit,
      ssl_included: true,
      backup_option: "daily",
      plesk_service_plan: p.name,
      plesk_plan_id: null,
      subdomain_limit: 10,
      ftp_account_limit: 5,
      is_active: true,
      is_popular: p.is_popular,
      sort_order: i + 1,
    }));
  }

  return data as HostingPlanRow[];
}

export async function getHostingPlanById(planId: string): Promise<HostingPlanRow | null> {
  const plans = await listActiveHostingPlans();
  return plans.find((p) => p.id === planId) ?? null;
}

export async function getHostingPlanBySlug(slug: string): Promise<HostingPlanRow | null> {
  const plans = await listActiveHostingPlans();
  return plans.find((p) => p.slug === slug) ?? null;
}

export function planAmountCents(plan: HostingPlanRow, cycle: "monthly" | "yearly"): number {
  return cycle === "yearly" ? plan.yearly_price_cents : plan.monthly_price_cents;
}

export async function createHostingOrder(input: {
  companyId: string;
  planId: string;
  domainName: string;
  domainType?: "new" | "existing" | "transfer";
  billingCycle?: "monthly" | "yearly";
}): Promise<
  | { ok: true; order: HostingOrderRow; invoice: HostingInvoiceRow }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const plan = await getHostingPlanById(input.planId);
  if (!plan) return { ok: false, error: "Hosting plan not found." };

  const domain = input.domainName.trim().toLowerCase();
  if (!domain) return { ok: false, error: "Domain name is required." };

  const billingCycle = input.billingCycle ?? "monthly";
  const amountCents = planAmountCents(plan, billingCycle);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const creds = await getPleskCredentials();
  let serverId: string | null =
    process.env.PLESK_DEFAULT_SERVER_ID?.trim() || null;

  if (!serverId) {
    const { data: defaultServer } = await admin
      .from("hosting_servers")
      .select("id")
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle();
    serverId = defaultServer?.id ?? null;
  }

  const { data: order, error: orderError } = await admin
    .from("hosting_orders")
    .insert({
      company_id: input.companyId,
      plan_id: plan.id,
      domain_name: domain,
      domain_type: input.domainType ?? "new",
      billing_cycle: billingCycle,
      status: "pending",
      payment_status: "unpaid",
      provisioning_status: "pending",
      server_id: serverId,
    })
    .select("*")
    .single();

  if (orderError || !order) {
    return { ok: false, error: orderError?.message ?? "Failed to create order." };
  }

  const { data: invoice, error: invoiceError } = await admin
    .from("hosting_invoices")
    .insert({
      invoice_number: invoiceNumber(),
      company_id: input.companyId,
      order_id: order.id,
      amount_cents: amountCents,
      tax_cents: 0,
      currency: "ZAR",
      status: "unpaid",
      due_date: dueDate.toISOString(),
    })
    .select("*")
    .single();

  if (invoiceError || !invoice) {
    return { ok: false, error: invoiceError?.message ?? "Failed to create invoice." };
  }

  await admin
    .from("hosting_orders")
    .update({ invoice_id: invoice.id, updated_at: new Date().toISOString() })
    .eq("id", order.id);

  await admin.from("hosting_domains").insert({
    company_id: input.companyId,
    domain_name: domain,
    domain_type: "primary",
    nameservers: creds?.defaultNameservers ?? [],
    dns_status: "pending",
    renewal_status: "unknown",
  });

  await notifyHostingOrderReceived(input.companyId, order.id, domain, plan.name);
  await notifyInvoiceCreated(input.companyId, invoice.invoice_number, amountCents);

  return {
    ok: true,
    order: { ...order, invoice_id: invoice.id } as HostingOrderRow,
    invoice: invoice as HostingInvoiceRow,
  };
}

export async function markHostingInvoicePaid(input: {
  invoiceId: string;
  paystackReference: string;
  paidAt: Date;
  paidAmount: number;
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("hosting_invoices")
    .select("*")
    .eq("paystack_reference", input.paystackReference)
    .maybeSingle();

  if (existing?.status === "paid") {
    return { ok: true, orderId: existing.order_id ?? "" };
  }

  const { data: invoice, error } = await admin
    .from("hosting_invoices")
    .select("*, hosting_orders(*, hosting_plans(*))")
    .eq("id", input.invoiceId)
    .maybeSingle();

  if (error || !invoice) {
    return { ok: false, error: "Invoice not found." };
  }

  if (invoice.status === "paid") {
    return { ok: true, orderId: invoice.order_id ?? "" };
  }

  if (input.paidAmount !== invoice.amount_cents) {
    return { ok: false, error: "Payment amount mismatch." };
  }

  const paidAtIso = input.paidAt.toISOString();

  await admin
    .from("hosting_invoices")
    .update({
      status: "paid",
      paid_at: paidAtIso,
      payment_provider: "paystack",
      paystack_reference: input.paystackReference,
      updated_at: paidAtIso,
    })
    .eq("id", invoice.id);

  const orderId = invoice.order_id;
  if (!orderId) return { ok: false, error: "Invoice has no linked order." };

  await admin
    .from("hosting_orders")
    .update({
      status: "paid",
      payment_status: "paid",
      updated_at: paidAtIso,
    })
    .eq("id", orderId);

  const order = invoice.hosting_orders as HostingOrderRow & {
    hosting_plans?: HostingPlanRow;
  };
  const plan = order?.hosting_plans;

  await admin.from("hosting_payments").insert({
    company_id: invoice.company_id,
    order_id: orderId,
    invoice_id: invoice.id,
    plan_slug: plan?.slug ?? "shared-basic",
    amount_cents: input.paidAmount,
    currency: "ZAR",
    paystack_reference: input.paystackReference,
    status: "success",
    paid_at: paidAtIso,
  });

  await notifyHostingPaymentSuccessful(
    invoice.company_id,
    invoice.invoice_number,
    invoice.amount_cents
  );

  // Legacy subscription sync for existing dashboard features
  if (plan?.slug) {
    await activateHostingSubscription({
      companyId: invoice.company_id,
      plan: plan.slug,
      paidAt: input.paidAt,
      paidAmount: input.paidAmount,
      reference: input.paystackReference,
    });
  }

  await provisionHostingOrder(orderId);
  return { ok: true, orderId };
}

export async function provisionHostingOrder(
  orderId: string
): Promise<{ ok: true; serviceId: string } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("hosting_orders")
    .select("*, hosting_plans(*)")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) return { ok: false, error: "Order not found." };
  if (order.status === "active") {
    const { data: existingService } = await admin
      .from("hosting_services")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existingService) return { ok: true, serviceId: existingService.id };
  }

  const plan = order.hosting_plans as HostingPlanRow;
  const now = new Date().toISOString();
  const nextDue = addBillingPeriod(new Date(), order.billing_cycle as "monthly" | "yearly");

  await admin
    .from("hosting_orders")
    .update({ status: "provisioning", provisioning_status: "running", updated_at: now })
    .eq("id", orderId);

  const { data: service, error: serviceError } = await admin
    .from("hosting_services")
    .insert({
      company_id: order.company_id,
      order_id: order.id,
      invoice_id: order.invoice_id,
      plan_id: order.plan_id,
      domain_name: order.domain_name,
      server_id: order.server_id,
      status: "pending",
      billing_cycle: order.billing_cycle,
      next_due_date: nextDue.toISOString(),
    })
    .select("id")
    .single();

  if (serviceError || !service) {
    await admin
      .from("hosting_orders")
      .update({ status: "failed", provisioning_status: "failed", updated_at: now })
      .eq("id", orderId);
    return { ok: false, error: serviceError?.message ?? "Failed to create service record." };
  }

  const provisioned = await createHostingAccount({
    companyId: order.company_id,
    orderId: order.id,
    serviceId: service.id,
    domainName: order.domain_name,
    planSlug: plan.slug,
    pleskServicePlan: plan.plesk_service_plan ?? plan.slug,
    serverId: order.server_id,
  });

  if (!provisioned.ok) {
    await admin
      .from("hosting_services")
      .update({ status: "failed", updated_at: now })
      .eq("id", service.id);
    await admin
      .from("hosting_orders")
      .update({ status: "failed", provisioning_status: "failed", updated_at: now })
      .eq("id", orderId);
    await notifyHostingProvisioningFailedAdmin(order.company_id, order.id, provisioned.error);
    return { ok: false, error: provisioned.error };
  }

  await admin
    .from("hosting_services")
    .update({
      status: "active",
      plesk_subscription_id: provisioned.pleskSubscriptionId,
      plesk_customer_id: provisioned.pleskCustomerId,
      username: provisioned.username,
      control_panel_url: provisioned.controlPanelUrl,
      updated_at: now,
    })
    .eq("id", service.id);

  await admin
    .from("hosting_orders")
    .update({ status: "active", provisioning_status: "completed", updated_at: now })
    .eq("id", orderId);

  if (order.invoice_id) {
    await admin
      .from("hosting_invoices")
      .update({ service_id: service.id, updated_at: now })
      .eq("id", order.invoice_id);
  }

  await admin
    .from("hosting_domains")
    .update({ service_id: service.id, dns_status: "active", updated_at: now })
    .eq("company_id", order.company_id)
    .eq("domain_name", order.domain_name);

  await notifyHostingAccountCreated(
    order.company_id,
    order.domain_name,
    provisioned.controlPanelUrl
  );

  await linkProvisionedDomainToWebsiteEngine({
    companyId: order.company_id,
    domainName: order.domain_name,
    serverId: order.server_id,
    pleskSubscriptionId: provisioned.pleskSubscriptionId,
  });

  return { ok: true, serviceId: service.id };
}

async function linkProvisionedDomainToWebsiteEngine(input: {
  companyId: string;
  domainName: string;
  serverId: string | null;
  pleskSubscriptionId: string;
}): Promise<void> {
  const normalizedDomain = normalizeDomain(input.domainName);
  if (!normalizedDomain) return;

  const domainProvision = await provisionCompanyWebsiteDomain({
    companyId: input.companyId,
    domain: normalizedDomain,
    hostingProvider: "plesk",
    syncHostingSubscription: true,
    isPrimary: true,
  });

  if (!domainProvision.ok) {
    console.error(
      "[hosting] post-provision domain link failed",
      normalizedDomain,
      domainProvision.error
    );
    return;
  }

  const admin = createAdminClient();
  const { data: domainRow } = await admin
    .from("website_domains")
    .select("verification_token")
    .eq("id", domainProvision.websiteDomainId)
    .maybeSingle();

  const creds = await getPleskCredentials(input.serverId);
  if (creds && domainRow?.verification_token) {
    const txtResult = await addPleskDnsRecord(creds, {
      siteId: input.pleskSubscriptionId,
      record: {
        type: "TXT",
        host: "_faraios",
        value: `faraios-verify=${domainRow.verification_token}`,
      },
      serverId: input.serverId ?? creds.serverId ?? undefined,
    });

    if (!txtResult.ok) {
      console.error(
        "[hosting] Plesk _faraios TXT sync failed",
        normalizedDomain,
        txtResult.error
      );
    }
  }

  try {
    await verifyWebsiteDomain(domainProvision.websiteDomainId, input.companyId);
  } catch (error) {
    console.error("[hosting] post-provision DNS verify failed", normalizedDomain, error);
  }
}

export async function getCompanyHostingOverview(companyId: string) {
  const admin = createAdminClient();

  const [services, orders, invoices, tickets] = await Promise.all([
    admin
      .from("hosting_services")
      .select("*, hosting_plans(*)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    admin
      .from("hosting_orders")
      .select("*, hosting_plans(*)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    admin
      .from("hosting_invoices")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    admin
      .from("hosting_support_tickets")
      .select("*")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
  ]);

  return {
    services: (services.data ?? []) as HostingServiceRow[],
    orders: (orders.data ?? []) as HostingOrderRow[],
    invoices: (invoices.data ?? []) as HostingInvoiceRow[],
    tickets: tickets.data ?? [],
  };
}

export async function retryFailedProvisioning(
  orderId: string
): Promise<{ ok: true; serviceId: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("hosting_orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "failed") {
    return { ok: false, error: "Only failed orders can be retried." };
  }

  await admin
    .from("hosting_orders")
    .update({
      status: "paid",
      provisioning_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return provisionHostingOrder(orderId);
}
