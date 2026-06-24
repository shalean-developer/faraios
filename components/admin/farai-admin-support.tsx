"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Clock,
  LifeBuoy,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";

import { adminCreateSupportTicket } from "@/app/actions/admin";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
import { formatTicketNumber } from "@/lib/format/admin-tickets";
import type {
  AdminSupportData,
  AdminSupportTicketPriority,
  AdminSupportTicketRow,
  AdminSupportTicketStatus,
} from "@/types/admin";

const STATUS_LABELS: Record<AdminSupportTicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_STYLES: Record<AdminSupportTicketStatus, string> = {
  open: "bg-sky-50 text-sky-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  waiting: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_STYLES: Record<AdminSupportTicketPriority, string> = {
  low: "bg-gray-50 text-gray-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

export function FaraiAdminSupport({ data }: { data: AdminSupportData }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminSupportTicketStatus>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.tickets.filter((ticket) => {
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      if (!q) return true;
      const ticketLabel = formatTicketNumber(ticket.ticketNumber).toLowerCase();
      return (
        ticketLabel.includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        (ticket.businessName?.toLowerCase().includes(q) ?? false) ||
        (ticket.requesterEmail?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data.tickets, search, statusFilter]);

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await adminCreateSupportTicket({
        subject,
        description,
        requesterName: requesterName || null,
        requesterEmail: requesterEmail || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSubject("");
      setDescription("");
      setRequesterName("");
      setRequesterEmail("");
      setShowCreate(false);
      if (result.ticketId) {
        window.location.href = `/admin/support/${result.ticketId}`;
      }
    });
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Support</h1>
          <p className="mt-0.5 text-xs text-gray-400">Platform support tickets and resolution workflows</p>
        </div>
        <div className="relative w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2 pl-9 pr-4 text-xs font-medium text-gray-700 outline-none focus:border-indigo-300 focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:border-indigo-300"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABELS) as AdminSupportTicketStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" />
          New ticket
        </button>
        <AdminActivityBellLink />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-5">
          {error ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Open", value: data.stats.open, icon: AlertCircle, color: "text-sky-600" },
              { label: "In Progress", value: data.stats.inProgress, icon: Clock, color: "text-indigo-600" },
              { label: "Waiting", value: data.stats.waiting, icon: MessageSquare, color: "text-amber-600" },
              { label: "Resolved This Month", value: data.stats.resolvedThisMonth, icon: LifeBuoy, color: "text-emerald-600" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <Icon className={`mb-2 h-4 w-4 ${stat.color}`} />
                  <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
                  <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {showCreate ? (
            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">Create support ticket</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300"
                />
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="Requester email (optional)"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300"
                />
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Requester name (optional)"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  className="md:col-span-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {isPending ? "Creating…" : "Create ticket"}
                </button>
              </div>
            </section>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-50 px-6 py-4">
              <h2 className="text-sm font-bold text-gray-900">All tickets</h2>
            </div>
            {filtered.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">
                No support tickets yet. Create one to start tracking customer issues.
              </div>
            ) : (
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/80">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Ticket</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Subject</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Business</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Priority</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Assignee</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function TicketRow({ ticket }: { ticket: AdminSupportTicketRow }) {
  return (
    <tr className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60">
      <td className="px-6 py-3.5">
        <Link href={`/admin/support/${ticket.id}`} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
          {formatTicketNumber(ticket.ticketNumber)}
        </Link>
        {ticket.messageCount > 0 ? (
          <p className="mt-0.5 text-[10px] text-gray-400">{ticket.messageCount} replies</p>
        ) : null}
      </td>
      <td className="px-4 py-3.5">
        <Link href={`/admin/support/${ticket.id}`} className="text-xs font-semibold text-gray-900 hover:text-indigo-700">
          {ticket.subject}
        </Link>
        {ticket.requesterEmail ? (
          <p className="mt-0.5 text-[10px] text-gray-400">{ticket.requesterEmail}</p>
        ) : null}
      </td>
      <td className="px-4 py-3.5 text-xs text-gray-600">
        {ticket.companyId && ticket.businessName ? (
          <Link href={`${ADMIN_BUSINESSES_PATH}/${ticket.companyId}`} className="hover:text-indigo-600">
            {ticket.businessName}
          </Link>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3.5">
        <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[ticket.status]}`}>
          {STATUS_LABELS[ticket.status]}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className={`rounded-lg px-2 py-1 text-[10px] font-bold capitalize ${PRIORITY_STYLES[ticket.priority]}`}>
          {ticket.priority}
        </span>
      </td>
      <td className="px-4 py-3.5 text-xs text-gray-600">{ticket.assignedTo ?? "Unassigned"}</td>
      <td className="px-4 py-3.5 text-xs text-gray-500">{ticket.updatedAt}</td>
    </tr>
  );
}
