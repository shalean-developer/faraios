import { listCompanySupportTickets } from "@/lib/services/company-platform-ops";
import { listInvoicesForCompany } from "@/lib/services/invoices";
import { listProjectsForCompany } from "@/lib/services/projects";
import { listQuotesForCompany } from "@/lib/services/quotes";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { InvoiceWithCustomer } from "@/types/financial";

export type CustomerFinancials = {
  totalInvoicedCents: number;
  paymentReceivedCents: number;
  dueCents: number;
};

export type ClientsOverviewMetrics = {
  totalClients: number;
  totalContacts: number;
  contactsActiveToday: number;
  contactsActiveLast7Days: number;
  clientsUnpaidInvoices: number;
  clientsPartiallyPaidInvoices: number;
  clientsOverdueInvoices: number;
  clientsUnpaidPct: number;
  clientsPartialPct: number;
  clientsOverduePct: number;
  projects: {
    open: number;
    completed: number;
    hold: number;
    canceled: number;
  };
  estimates: {
    open: number;
    accepted: number;
    newRequests: number;
    inProgress: number;
  };
  clientsOpenTickets: number;
  clientsOpenTicketsPct: number;
  clientsNewOrders: number;
  clientsNewOrdersPct: number;
  proposals: {
    open: number;
    accepted: number;
    rejected: number;
  };
};

function pct(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

export function buildCustomerFinancialsMap(
  invoices: InvoiceWithCustomer[]
): Record<string, CustomerFinancials> {
  const map: Record<string, CustomerFinancials> = {};

  for (const invoice of invoices) {
    if (!invoice.customer_id) continue;
    const current = map[invoice.customer_id] ?? {
      totalInvoicedCents: 0,
      paymentReceivedCents: 0,
      dueCents: 0,
    };
    current.totalInvoicedCents += invoice.total_cents ?? 0;
    current.paymentReceivedCents += invoice.amount_paid_cents ?? 0;
    current.dueCents += invoice.balance_due_cents ?? 0;
    map[invoice.customer_id] = current;
  }

  return map;
}

export async function getClientsOverviewMetrics(
  companyId: string,
  totalClients: number
): Promise<{
  metrics: ClientsOverviewMetrics;
  financials: Record<string, CustomerFinancials>;
}> {
  const emptyMetrics: ClientsOverviewMetrics = {
    totalClients,
    totalContacts: totalClients,
    contactsActiveToday: 0,
    contactsActiveLast7Days: 0,
    clientsUnpaidInvoices: 0,
    clientsPartiallyPaidInvoices: 0,
    clientsOverdueInvoices: 0,
    clientsUnpaidPct: 0,
    clientsPartialPct: 0,
    clientsOverduePct: 0,
    projects: { open: 0, completed: 0, hold: 0, canceled: 0 },
    estimates: { open: 0, accepted: 0, newRequests: 0, inProgress: 0 },
    clientsOpenTickets: 0,
    clientsOpenTicketsPct: 0,
    clientsNewOrders: 0,
    clientsNewOrdersPct: 0,
    proposals: { open: 0, accepted: 0, rejected: 0 },
  };

  if (!isSupabaseConfigured() || !companyId) {
    return { metrics: emptyMetrics, financials: {} };
  }

  const supabase = await createClient();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const [invoices, quotes, projects, tickets, customersRes, bookingsRes] = await Promise.all([
    listInvoicesForCompany(companyId),
    listQuotesForCompany(companyId),
    listProjectsForCompany(companyId),
    listCompanySupportTickets(companyId),
    supabase
      .from("customers")
      .select("id, updated_at")
      .eq("company_id", companyId),
    supabase
      .from("bookings")
      .select("customer_id, status, created_at")
      .eq("company_id", companyId)
      .not("customer_id", "is", null),
  ]);

  const financials = buildCustomerFinancialsMap(invoices);

  const unpaidCustomers = new Set<string>();
  const partialCustomers = new Set<string>();
  const overdueCustomers = new Set<string>();

  for (const invoice of invoices) {
    if (!invoice.customer_id) continue;
    if (invoice.status === "draft" || invoice.status === "cancelled" || invoice.status === "refunded") {
      continue;
    }
    if ((invoice.balance_due_cents ?? 0) > 0) {
      unpaidCustomers.add(invoice.customer_id);
    }
    if (
      invoice.status === "partially_paid" ||
      ((invoice.amount_paid_cents ?? 0) > 0 && (invoice.balance_due_cents ?? 0) > 0)
    ) {
      partialCustomers.add(invoice.customer_id);
    }
    if (invoice.status === "overdue") {
      overdueCustomers.add(invoice.customer_id);
    }
  }

  let contactsActiveToday = 0;
  let contactsActiveLast7Days = 0;
  for (const row of customersRes.data ?? []) {
    const updated = new Date(row.updated_at ?? 0).getTime();
    if (updated >= dayAgo) contactsActiveToday += 1;
    if (updated >= weekAgo) contactsActiveLast7Days += 1;
  }

  const projectsCounts = { open: 0, completed: 0, hold: 0, canceled: 0 };
  for (const project of projects) {
    const status = project.status ?? "open";
    if (status === "completed") projectsCounts.completed += 1;
    else if (status === "on_hold" || status === "hold") projectsCounts.hold += 1;
    else if (status === "cancelled" || status === "canceled") projectsCounts.canceled += 1;
    else projectsCounts.open += 1;
  }

  const estimates = { open: 0, accepted: 0, newRequests: 0, inProgress: 0 };
  for (const quote of quotes) {
    if (quote.status === "accepted" || quote.status === "converted") {
      estimates.accepted += 1;
    } else if (quote.status === "draft") {
      estimates.newRequests += 1;
    } else if (quote.status === "sent" || quote.status === "viewed") {
      estimates.open += 1;
      estimates.inProgress += 1;
    }
  }

  const proposals = { open: 0, accepted: 0, rejected: 0 };
  for (const quote of quotes) {
    if (quote.status === "accepted" || quote.status === "converted") proposals.accepted += 1;
    else if (quote.status === "rejected") proposals.rejected += 1;
    else if (quote.status === "sent" || quote.status === "viewed" || quote.status === "draft") {
      proposals.open += 1;
    }
  }

  const openTicketCount = tickets.filter(
    (ticket) => ticket.status !== "closed" && ticket.status !== "resolved"
  ).length;

  const activeBookingCustomers = new Set<string>();
  const recentOrderCustomers = new Set<string>();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  for (const booking of bookingsRes.data ?? []) {
    const customerId = booking.customer_id as string;
    const status = booking.status ?? "";
    if (["confirmed", "assigned", "in_progress"].includes(status)) {
      activeBookingCustomers.add(customerId);
    }
    const created = new Date(booking.created_at ?? 0).getTime();
    if (created >= monthAgo) {
      recentOrderCustomers.add(customerId);
    }
  }

  const clientsOpenTickets = Math.min(activeBookingCustomers.size || openTicketCount, totalClients);
  const clientsNewOrders = recentOrderCustomers.size;

  return {
    financials,
    metrics: {
      totalClients,
      totalContacts: totalClients,
      contactsActiveToday,
      contactsActiveLast7Days,
      clientsUnpaidInvoices: unpaidCustomers.size,
      clientsPartiallyPaidInvoices: partialCustomers.size,
      clientsOverdueInvoices: overdueCustomers.size,
      clientsUnpaidPct: pct(unpaidCustomers.size, totalClients),
      clientsPartialPct: pct(partialCustomers.size, totalClients),
      clientsOverduePct: pct(overdueCustomers.size, totalClients),
      projects: projectsCounts,
      estimates,
      clientsOpenTickets,
      clientsOpenTicketsPct: pct(clientsOpenTickets, totalClients),
      clientsNewOrders,
      clientsNewOrdersPct: pct(clientsNewOrders, totalClients),
      proposals,
    },
  };
}
