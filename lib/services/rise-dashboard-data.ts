import {
  buildStatusToProjectStatus,
  DEFAULT_PROGRESS_BY_STATUS,
} from "@/lib/data/project-stages";
import { listCompanySupportTickets } from "@/lib/services/company-platform-ops";
import { listProjectsForCompany } from "@/lib/services/projects";
import { listStaffProfiles } from "@/lib/services/staff-profiles";
import { listCompanyMembers } from "@/lib/services/team";
import { listTasks, summarizeTasks } from "@/lib/services/tasks";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { CompanyMember } from "@/lib/services/team";
import type { CompanySupportTicketRow } from "@/lib/services/company-platform-ops";
import type { CompanyTask, StaffProfile } from "@/types/v6-engine";

export type RiseBookingCounts = {
  open: number;
  completed: number;
  hold: number;
};

export type RiseInvoiceBreakdown = {
  overdue: number;
  notPaid: number;
  partiallyPaid: number;
  fullyPaid: number;
  draft: number;
  overdueCents: number;
  notPaidCents: number;
  partiallyPaidCents: number;
  fullyPaidCents: number;
  draftCents: number;
  totalInvoicedCents: number;
  dueCents: number;
};

export type RiseReminderInfo = {
  todayCount: number;
  nextDate: string | null;
  nextLabel: string | null;
};

export type RiseTicketCounts = {
  new: number;
  open: number;
  closed: number;
};

export type RiseOpenProject = {
  id: string;
  name: string;
  progress: number;
  startDate: string;
  deadline: string | null;
};

export type RiseIncomeExpenseSummary = {
  incomeThisYearCents: number;
  expenseThisYearCents: number;
  incomeLastYearCents: number;
  expenseLastYearCents: number;
};

export type RiseClockInSummary = {
  value: string;
  sub: string;
};

export type RiseTeamAttendanceSummary = {
  onLeave: number;
  clockedIn: number;
  clockedOut: number;
};

export type RiseDashboardExtras = {
  tasks: CompanyTask[];
  myTasks: CompanyTask[];
  myOpenTasksCount: number;
  taskSummary: ReturnType<typeof summarizeTasks>;
  members: CompanyMember[];
  supportTickets: CompanySupportTicketRow[];
  bookingCounts: RiseBookingCounts;
  invoiceBreakdown: RiseInvoiceBreakdown;
  invoiceMonthlyCents: number[];
  ticketCounts: RiseTicketCounts;
  openProjects: RiseOpenProject[];
  eventsToday: number;
  reminder: RiseReminderInfo;
  lastAnnouncement: string | null;
  clockIn: RiseClockInSummary;
  teamAttendance: RiseTeamAttendanceSummary;
  incomeExpense: RiseIncomeExpenseSummary;
};

function summarizeBookings(rows: { status: string }[]): RiseBookingCounts {
  let open = 0;
  let completed = 0;
  let hold = 0;

  for (const row of rows) {
    if (row.status === "completed") completed += 1;
    else if (row.status === "cancelled" || row.status === "rescheduled") hold += 1;
    else open += 1;
  }

  return { open, completed, hold };
}

function summarizeInvoices(
  rows: { status: string; total_cents: number; balance_due_cents: number }[]
): RiseInvoiceBreakdown {
  let overdue = 0;
  let notPaid = 0;
  let partiallyPaid = 0;
  let fullyPaid = 0;
  let draft = 0;
  let overdueCents = 0;
  let notPaidCents = 0;
  let partiallyPaidCents = 0;
  let fullyPaidCents = 0;
  let draftCents = 0;
  let totalInvoicedCents = 0;
  let dueCents = 0;

  for (const row of rows) {
    const total = row.total_cents ?? 0;
    const balance = row.balance_due_cents ?? 0;
    if (row.status !== "cancelled" && row.status !== "refunded") {
      totalInvoicedCents += total;
    }
    switch (row.status) {
      case "overdue":
        overdue += 1;
        overdueCents += balance;
        dueCents += balance;
        break;
      case "issued":
        notPaid += 1;
        notPaidCents += balance;
        dueCents += balance;
        break;
      case "partially_paid":
        partiallyPaid += 1;
        partiallyPaidCents += balance;
        dueCents += balance;
        break;
      case "paid":
        fullyPaid += 1;
        fullyPaidCents += total;
        break;
      case "draft":
        draft += 1;
        draftCents += total;
        break;
      default:
        break;
    }
  }

  return {
    overdue,
    notPaid,
    partiallyPaid,
    fullyPaid,
    draft,
    overdueCents,
    notPaidCents,
    partiallyPaidCents,
    fullyPaidCents,
    draftCents,
    totalInvoicedCents,
    dueCents,
  };
}

function formatReminderDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function summarizeReminders(
  tasks: CompanyTask[],
  subscriptionExpiresAt: string | null,
  nextBillingDate: string | null
): RiseReminderInfo {
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = tasks.filter(
    (task) =>
      task.dueDate === today &&
      task.status !== "done" &&
      task.status !== "cancelled"
  ).length;

  const upcomingTasks = tasks
    .filter(
      (task) =>
        task.dueDate &&
        task.dueDate >= today &&
        task.status !== "done" &&
        task.status !== "cancelled"
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const renewalDate = subscriptionExpiresAt ?? nextBillingDate;
  let nextDate: string | null = null;
  let nextLabel: string | null = null;

  if (upcomingTasks[0]?.dueDate) {
    nextDate = upcomingTasks[0].dueDate;
    nextLabel = upcomingTasks[0].title;
  }

  if (renewalDate) {
    const renewalDay = renewalDate.slice(0, 10);
    if (!nextDate || renewalDay < nextDate) {
      nextDate = renewalDay;
      nextLabel = "Renewal";
    }
  }

  return {
    todayCount: dueToday,
    nextDate: nextDate ? formatReminderDate(nextDate) : null,
    nextLabel,
  };
}

function summarizeTickets(tickets: CompanySupportTicketRow[]): RiseTicketCounts {
  let newCount = 0;
  let open = 0;
  let closed = 0;

  for (const ticket of tickets) {
    const status = ticket.status.toLowerCase();
    if (status.includes("closed") || status.includes("resolved")) closed += 1;
    else if (status.includes("new")) newCount += 1;
    else open += 1;
  }

  return { new: newCount, open, closed };
}

function formatProjectDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function summarizeOpenProjects(
  projects: Awaited<ReturnType<typeof listProjectsForCompany>>
): RiseOpenProject[] {
  return projects
    .filter((project) => project.status !== "completed")
    .map((project) => ({
      id: project.id,
      name: project.name,
      progress: project.progress ?? 0,
      startDate: formatProjectDate(project.created_at),
      deadline: null,
    }));
}

function resolveOpenProjects(
  projects: Awaited<ReturnType<typeof listProjectsForCompany>>,
  company: {
    id: string;
    name: string;
    build_status?: string | null;
    created_at?: string | null;
  }
): RiseOpenProject[] {
  const open = summarizeOpenProjects(projects);
  if (open.length > 0) return open;

  const status = buildStatusToProjectStatus(company.build_status ?? "pending");
  if (status === "completed") return [];

  return [
    {
      id: `website-${company.id}`,
      name: `${company.name} — Website`,
      progress: DEFAULT_PROGRESS_BY_STATUS[status],
      startDate: formatProjectDate(company.created_at ?? new Date().toISOString()),
      deadline: null,
    },
  ];
}

type BookingRow = {
  status: string;
  assigned_staff_id?: string | null;
  service?: string | null;
  booking_date?: string | null;
};

function isBookingToday(bookingDate: string | null | undefined, todayStart: Date, todayEnd: Date): boolean {
  if (!bookingDate) return false;
  const when = new Date(bookingDate);
  if (Number.isNaN(when.getTime())) return false;
  return when >= todayStart && when < todayEnd;
}

function formatClockTime(bookingDate: string): string {
  return new Date(bookingDate).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildClockInSummary(
  userId: string | null | undefined,
  todayBookings: BookingRow[]
): RiseClockInSummary {
  if (!userId) {
    return { value: "—", sub: "Sign in to track shifts" };
  }

  const activeJob = todayBookings.find(
    (booking) =>
      booking.assigned_staff_id === userId &&
      booking.booking_date &&
      ["pending", "confirmed", "in_progress"].includes(booking.status)
  );

  if (activeJob?.booking_date) {
    return {
      value: formatClockTime(activeJob.booking_date),
      sub: `On job: ${activeJob.service?.trim() || "Booking"}`,
    };
  }

  if (todayBookings.length > 0) {
    return {
      value: String(todayBookings.length),
      sub: `${todayBookings.length} booking${todayBookings.length === 1 ? "" : "s"} scheduled today`,
    };
  }

  return { value: "—", sub: "No shifts scheduled today" };
}

function buildTeamAttendance(
  memberCount: number,
  staffProfiles: StaffProfile[],
  todayBookings: BookingRow[]
): RiseTeamAttendanceSummary {
  const assignedToday = new Set(
    todayBookings
      .filter((booking) => booking.assigned_staff_id && booking.status !== "cancelled")
      .map((booking) => booking.assigned_staff_id as string)
  );

  const onLeave = staffProfiles.filter((profile) => {
    const availability = profile.availability ?? {};
    return availability.on_leave === true || availability.status === "leave";
  }).length;

  const clockedIn = assignedToday.size;
  const clockedOut = Math.max(0, memberCount - clockedIn - onLeave);

  return { onLeave, clockedIn, clockedOut };
}

function filterMyTasks(tasks: CompanyTask[], userId: string | null | undefined): CompanyTask[] {
  if (!userId) return tasks;

  const assigned = tasks.filter(
    (task) => task.assignedTo === userId || (!task.assignedTo && task.createdBy === userId)
  );

  return assigned.length > 0 ? assigned : tasks;
}

function countOpenTasks(tasks: CompanyTask[]): number {
  return tasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length;
}

function sumPaidInRange(
  rows: Array<{ amount_cents?: number | null; status?: string | null; paid_at?: string | null; created_at?: string | null }>,
  start: Date,
  end: Date,
  paidStatuses: string[]
): number {
  return rows
    .filter((row) => paidStatuses.includes(row.status ?? ""))
    .filter((row) => {
      const when = new Date(row.paid_at ?? row.created_at ?? "");
      return !Number.isNaN(when.getTime()) && when >= start && when <= end;
    })
    .reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
}

function buildIncomeExpenseSummary(
  customerPayments: Array<{
    amount_cents?: number | null;
    status?: string | null;
    paid_at?: string | null;
    created_at?: string | null;
  }>,
  subscriptionPayments: Array<{
    amount_cents?: number | null;
    status?: string | null;
    paid_at?: string | null;
  }>,
  hostingPayments: Array<{
    amount_cents?: number | null;
    status?: string | null;
    paid_at?: string | null;
    created_at?: string | null;
  }>
): RiseIncomeExpenseSummary {
  const now = new Date();
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(now.getFullYear(), 0, 0, 23, 59, 59, 999);

  const incomeThisYearCents = sumPaidInRange(
    customerPayments,
    thisYearStart,
    now,
    ["paid"]
  );
  const incomeLastYearCents = sumPaidInRange(
    customerPayments,
    lastYearStart,
    lastYearEnd,
    ["paid"]
  );

  const platformExpenseRows = [...subscriptionPayments, ...hostingPayments];
  const refundedRows = customerPayments.filter((row) => row.status === "refunded");

  const expenseThisYearCents =
    sumPaidInRange(platformExpenseRows, thisYearStart, now, ["paid", "success"]) +
    sumPaidInRange(refundedRows, thisYearStart, now, ["refunded"]);
  const expenseLastYearCents =
    sumPaidInRange(platformExpenseRows, lastYearStart, lastYearEnd, ["paid", "success"]) +
    sumPaidInRange(refundedRows, lastYearStart, lastYearEnd, ["refunded"]);

  return {
    incomeThisYearCents,
    expenseThisYearCents,
    incomeLastYearCents,
    expenseLastYearCents,
  };
}

function buildInvoiceMonthlyTotals(
  rows: Array<{ total_cents?: number | null; created_at?: string | null; status?: string | null }>
): number[] {
  const now = new Date();
  const months: number[] = [];

  for (let i = 11; i >= 0; i -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const total = rows
      .filter((row) => row.status !== "cancelled" && row.status !== "refunded")
      .filter((row) => {
        const when = new Date(row.created_at ?? "");
        return !Number.isNaN(when.getTime()) && when >= monthStart && when <= monthEnd;
      })
      .reduce((sum, row) => sum + (row.total_cents ?? 0), 0);
    months.push(total);
  }

  return months;
}

export async function getRiseDashboardExtras(
  companyId: string,
  userId?: string | null
): Promise<RiseDashboardExtras> {
  const emptyIncomeExpense: RiseIncomeExpenseSummary = {
    incomeThisYearCents: 0,
    expenseThisYearCents: 0,
    incomeLastYearCents: 0,
    expenseLastYearCents: 0,
  };

  const empty: RiseDashboardExtras = {
    tasks: [],
    myTasks: [],
    myOpenTasksCount: 0,
    taskSummary: { total: 0, open: 0, inProgress: 0, done: 0, overdue: 0 },
    members: [],
    supportTickets: [],
    bookingCounts: { open: 0, completed: 0, hold: 0 },
    invoiceBreakdown: {
      overdue: 0,
      notPaid: 0,
      partiallyPaid: 0,
      fullyPaid: 0,
      draft: 0,
      overdueCents: 0,
      notPaidCents: 0,
      partiallyPaidCents: 0,
      fullyPaidCents: 0,
      draftCents: 0,
      totalInvoicedCents: 0,
      dueCents: 0,
    },
    invoiceMonthlyCents: Array.from({ length: 12 }, () => 0),
    ticketCounts: { new: 0, open: 0, closed: 0 },
    openProjects: [],
    eventsToday: 0,
    reminder: { todayCount: 0, nextDate: null, nextLabel: null },
    lastAnnouncement: null,
    clockIn: { value: "—", sub: "No shifts scheduled today" },
    teamAttendance: { onLeave: 0, clockedIn: 0, clockedOut: 0 },
    incomeExpense: emptyIncomeExpense,
  };

  if (!isSupabaseConfigured() || !companyId) return empty;

  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [
    tasks,
    members,
    supportTickets,
    staffProfiles,
    bookingsRes,
    invoicesRes,
    companyRes,
    customerPaymentsRes,
    subscriptionPaymentsRes,
    hostingPaymentsRes,
    announcementRes,
  ] = await Promise.all([
    listTasks(companyId),
    listCompanyMembers(companyId),
    listCompanySupportTickets(companyId),
    listStaffProfiles(companyId),
    supabase
      .from("bookings")
      .select("status, assigned_staff_id, service, booking_date")
      .eq("company_id", companyId),
    supabase
      .from("invoices")
      .select("status, total_cents, balance_due_cents, created_at")
      .eq("company_id", companyId),
    supabase
      .from("companies")
      .select("name, build_status, subscription_expires_at, next_billing_date, created_at")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("customer_payments")
      .select("amount_cents, status, paid_at, created_at")
      .eq("company_id", companyId),
    supabase
      .from("subscription_payments")
      .select("amount_cents, status, paid_at")
      .eq("company_id", companyId),
    supabase
      .from("hosting_payments")
      .select("amount_cents, status, paid_at, created_at")
      .eq("company_id", companyId),
    supabase
      .from("company_notifications")
      .select("title, body, created_at")
      .eq("company_id", companyId)
      .or(userId ? `user_id.is.null,user_id.eq.${userId}` : "user_id.is.null")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const bookingRows = (bookingsRes.data ?? []) as BookingRow[];
  const invoiceRows = (invoicesRes.data ?? []) as {
    status: string;
    total_cents: number;
    balance_due_cents: number;
    created_at?: string | null;
  }[];

  const companyRow = companyRes.data as {
    name?: string | null;
    build_status?: string | null;
    subscription_expires_at?: string | null;
    next_billing_date?: string | null;
    created_at?: string | null;
  } | null;

  const projects = await listProjectsForCompany(
    companyId,
    companyRow?.build_status ?? null
  );

  const todayBookings = bookingRows.filter(
    (booking) =>
      booking.status !== "cancelled" &&
      isBookingToday(booking.booking_date, todayStart, todayEnd)
  );

  const myTasks = filterMyTasks(tasks, userId);
  const myOpenTasksCount = countOpenTasks(myTasks);

  const announcementRow = announcementRes.data as {
    title?: string | null;
    body?: string | null;
  } | null;

  return {
    tasks,
    myTasks,
    myOpenTasksCount,
    taskSummary: summarizeTasks(tasks),
    members,
    supportTickets,
    bookingCounts: summarizeBookings(bookingRows),
    invoiceBreakdown: summarizeInvoices(invoiceRows),
    invoiceMonthlyCents: buildInvoiceMonthlyTotals(invoiceRows),
    ticketCounts: summarizeTickets(supportTickets),
    openProjects: companyRow?.name
      ? resolveOpenProjects(projects, {
          id: companyId,
          name: companyRow.name,
          build_status: companyRow.build_status ?? null,
          created_at: companyRow.created_at ?? null,
        })
      : summarizeOpenProjects(projects),
    eventsToday: todayBookings.length,
    reminder: summarizeReminders(
      tasks,
      companyRow?.subscription_expires_at ?? null,
      companyRow?.next_billing_date ?? null
    ),
    lastAnnouncement:
      announcementRow?.body?.trim() ||
      announcementRow?.title?.trim() ||
      null,
    clockIn: buildClockInSummary(userId, todayBookings),
    teamAttendance: buildTeamAttendance(members.length, staffProfiles, todayBookings),
    incomeExpense: buildIncomeExpenseSummary(
      customerPaymentsRes.data ?? [],
      subscriptionPaymentsRes.data ?? [],
      hostingPaymentsRes.data ?? []
    ),
  };
}

export type RiseRevenuePageExtras = {
  invoiceBreakdown: RiseInvoiceBreakdown;
  invoiceMonthlyCents: number[];
  incomeExpense: RiseIncomeExpenseSummary;
};

export async function getRiseRevenuePageExtras(
  companyId: string
): Promise<RiseRevenuePageExtras> {
  const empty: RiseRevenuePageExtras = {
    invoiceBreakdown: {
      overdue: 0,
      notPaid: 0,
      partiallyPaid: 0,
      fullyPaid: 0,
      draft: 0,
      overdueCents: 0,
      notPaidCents: 0,
      partiallyPaidCents: 0,
      fullyPaidCents: 0,
      draftCents: 0,
      totalInvoicedCents: 0,
      dueCents: 0,
    },
    invoiceMonthlyCents: Array.from({ length: 12 }, () => 0),
    incomeExpense: {
      incomeThisYearCents: 0,
      expenseThisYearCents: 0,
      incomeLastYearCents: 0,
      expenseLastYearCents: 0,
    },
  };

  if (!isSupabaseConfigured() || !companyId) return empty;

  const supabase = await createClient();
  const [invoicesRes, customerPaymentsRes, subscriptionPaymentsRes, hostingPaymentsRes] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("status, total_cents, balance_due_cents, created_at")
        .eq("company_id", companyId),
      supabase
        .from("customer_payments")
        .select("amount_cents, status, paid_at, created_at")
        .eq("company_id", companyId),
      supabase
        .from("subscription_payments")
        .select("amount_cents, status, paid_at")
        .eq("company_id", companyId),
      supabase
        .from("hosting_payments")
        .select("amount_cents, status, paid_at, created_at")
        .eq("company_id", companyId),
    ]);

  const invoiceRows = (invoicesRes.data ?? []) as {
    status: string;
    total_cents: number;
    balance_due_cents: number;
    created_at?: string | null;
  }[];

  return {
    invoiceBreakdown: summarizeInvoices(invoiceRows),
    invoiceMonthlyCents: buildInvoiceMonthlyTotals(invoiceRows),
    incomeExpense: buildIncomeExpenseSummary(
      customerPaymentsRes.data ?? [],
      subscriptionPaymentsRes.data ?? [],
      hostingPaymentsRes.data ?? []
    ),
  };
}
