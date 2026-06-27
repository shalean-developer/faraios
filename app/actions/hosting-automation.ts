"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyPermission } from "@/lib/services/company-access";
import {
  createHostingOrder,
  getCompanyHostingOverview,
} from "@/lib/services/hosting-automation";
import { activateHostingOrderPayment } from "@/lib/billing/hosting-order-payment";
import {
  createHostingSupportTicket,
  notifyCancellationConfirmation,
} from "@/lib/services/hosting-notifications";
import {
  companyHostingPath,
  companyHostingOrderPath,
  companyHostingServicesPath,
  companyHostingInvoicesPath,
  companyHostingSupportPath,
} from "@/lib/paths/company";

type ActionResult = { ok: true; orderId?: string; invoiceId?: string } | { ok: false; error: string };

export async function createHostingOrderAction(input: {
  companyId: string;
  companySlug: string;
  planId: string;
  domainName: string;
  domainType?: "new" | "existing" | "transfer";
  billingCycle?: "monthly" | "yearly";
}): Promise<ActionResult> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const result = await createHostingOrder({
    companyId: input.companyId,
    planId: input.planId,
    domainName: input.domainName,
    domainType: input.domainType,
    billingCycle: input.billingCycle,
  });

  if (!result.ok) return result;

  revalidatePath(companyHostingPath(input.companySlug));
  revalidatePath(companyHostingOrderPath(input.companySlug));
  return { ok: true, orderId: result.order.id, invoiceId: result.invoice.id };
}

export async function confirmHostingOrderPaymentAction(input: {
  reference: string;
  companyId: string;
  companySlug: string;
}): Promise<ActionResult> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const result = await activateHostingOrderPayment({
    reference: input.reference,
    companyId: input.companyId,
  });

  if (!result.ok) return result;

  revalidatePath(companyHostingPath(input.companySlug));
  revalidatePath(companyHostingServicesPath(input.companySlug));
  revalidatePath(companyHostingInvoicesPath(input.companySlug));
  return { ok: true };
}

export async function requestHostingCancellationAction(input: {
  companyId: string;
  companySlug: string;
  serviceId: string;
  domainName: string;
}): Promise<ActionResult> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const admin = createAdminClient();
  const { data: service } = await admin
    .from("hosting_services")
    .select("order_id")
    .eq("id", input.serviceId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (!service?.order_id) {
    return { ok: false, error: "Could not find an order for this hosting service." };
  }

  const { error } = await admin
    .from("hosting_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", service.order_id)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  await notifyCancellationConfirmation(input.companyId, input.domainName);
  revalidatePath(companyHostingServicesPath(input.companySlug));
  return { ok: true };
}

export async function createHostingSupportTicketAction(input: {
  companyId: string;
  companySlug: string;
  serviceId?: string;
  subject: string;
  message: string;
  priority?: string;
}): Promise<{ ok: true; ticketId: string } | { ok: false; error: string }> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await createHostingSupportTicket({
    companyId: input.companyId,
    serviceId: input.serviceId,
    subject: input.subject,
    message: input.message,
    priority: input.priority,
    userId: user?.id,
  });

  if (!result.ok) return result;

  revalidatePath(companyHostingSupportPath(input.companySlug));
  return { ok: true, ticketId: result.ticketId };
}

export async function getCompanyHostingOverviewAction(companyId: string) {
  const access = await requireCompanyPermission(companyId, "view_websites");
  if (!access.ok) return null;
  return getCompanyHostingOverview(companyId);
}

export async function requestHostingMailboxAction(input: {
  companyId: string;
  companySlug: string;
  serviceId: string;
  value: string;
}): Promise<ActionResult> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const { adminCreateMailbox } = await import("@/lib/services/hosting-resources");
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("hosting_services")
    .select("id")
    .eq("id", input.serviceId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (!service) return { ok: false, error: "Service not found." };

  const result = await adminCreateMailbox({
    serviceId: input.serviceId,
    mailboxName: input.value,
  });

  if (!result.ok) return result;
  revalidatePath(`/${input.companySlug}/dashboard/hosting/mailboxes`);
  return { ok: true };
}

export async function requestHostingFtpAction(input: {
  companyId: string;
  companySlug: string;
  serviceId: string;
  value: string;
}): Promise<ActionResult> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const { adminCreateFtpAccount } = await import("@/lib/services/hosting-resources");
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("hosting_services")
    .select("id")
    .eq("id", input.serviceId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (!service) return { ok: false, error: "Service not found." };

  const result = await adminCreateFtpAccount({
    serviceId: input.serviceId,
    username: input.value,
  });

  if (!result.ok) return result;
  revalidatePath(`/${input.companySlug}/dashboard/hosting/ftp`);
  return { ok: true };
}

export async function requestHostingDatabaseAction(input: {
  companyId: string;
  companySlug: string;
  serviceId: string;
  value: string;
}): Promise<ActionResult> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const { adminCreateDatabase } = await import("@/lib/services/hosting-resources");
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("hosting_services")
    .select("id")
    .eq("id", input.serviceId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (!service) return { ok: false, error: "Service not found." };

  const result = await adminCreateDatabase({
    serviceId: input.serviceId,
    dbName: input.value,
  });

  if (!result.ok) return result;
  revalidatePath(`/${input.companySlug}/dashboard/hosting/databases`);
  return { ok: true };
}
