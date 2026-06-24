import { notifyInvoiceOverdue } from "@/lib/services/financial-notifications";
import { markOverdueInvoices } from "@/lib/services/invoices";
import { getOrCreatePortalToken } from "@/lib/services/portal-access";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type OverdueInvoiceProcessResult = {
  companiesProcessed: number;
  markedOverdue: number;
  remindersSent: number;
  errors: string[];
};

export async function processOverdueInvoicesForAllCompanies(): Promise<OverdueInvoiceProcessResult> {
  const result: OverdueInvoiceProcessResult = {
    companiesProcessed: 0,
    markedOverdue: 0,
    remindersSent: 0,
    errors: [],
  };

  if (!isSupabaseConfigured()) return result;

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    result.errors.push(admin.error);
    return result;
  }

  const { data: companies, error } = await admin.client
    .from("companies")
    .select("id");

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const company of companies ?? []) {
    const companyResult = await processOverdueInvoicesForCompany(company.id as string);
    result.companiesProcessed += 1;
    result.markedOverdue += companyResult.markedOverdue;
    result.remindersSent += companyResult.remindersSent;
    result.errors.push(...companyResult.errors);
  }

  return result;
}

export async function processOverdueInvoicesForCompany(
  companyId: string
): Promise<Pick<OverdueInvoiceProcessResult, "markedOverdue" | "remindersSent" | "errors">> {
  const result = { markedOverdue: 0, remindersSent: 0, errors: [] as string[] };

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    result.errors.push(admin.error);
    return result;
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: dueInvoices } = await admin.client
    .from("invoices")
    .select("id, status")
    .eq("company_id", companyId)
    .in("status", ["issued", "partially_paid"])
    .lt("due_date", today);

  await markOverdueInvoices(companyId);
  result.markedOverdue = dueInvoices?.length ?? 0;

  const { data: overdueInvoices, error } = await admin.client
    .from("invoices")
    .select(
      "id, invoice_number, balance_due_cents, customer_id, overdue_reminder_sent_at, customers(name, email)"
    )
    .eq("company_id", companyId)
    .eq("status", "overdue")
    .is("overdue_reminder_sent_at", null);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const invoice of overdueInvoices ?? []) {
    const customer = invoice.customers as { name?: string; email?: string } | null;
    const email = customer?.email?.trim();
    if (!email) continue;

    const token = await getOrCreatePortalToken(companyId, invoice.customer_id as string);
    if (!token) {
      result.errors.push(`Could not create portal token for invoice ${invoice.id}`);
      continue;
    }

    try {
      await notifyInvoiceOverdue({
        companyId,
        customerEmail: email,
        customerName: customer?.name ?? "Customer",
        invoiceNumber: invoice.invoice_number as string,
        balanceDueCents: invoice.balance_due_cents as number,
        portalToken: token,
      });

      await admin.client
        .from("invoices")
        .update({ overdue_reminder_sent_at: new Date().toISOString() })
        .eq("id", invoice.id);

      result.remindersSent += 1;
    } catch (err) {
      result.errors.push(
        err instanceof Error ? err.message : `Failed reminder for invoice ${invoice.id}`
      );
    }
  }

  return result;
}
