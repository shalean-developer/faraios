"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Send } from "lucide-react";

import {
  adminReplySupportTicket,
  adminUpdateSupportTicket,
} from "@/app/actions/admin";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
import { ADMIN_DEVELOPER_OPTIONS } from "@/lib/constants/admin-developers";
import { formatTicketNumber } from "@/lib/format/admin-tickets";
import type {
  AdminSupportTicketDetail,
  AdminSupportTicketPriority,
  AdminSupportTicketStatus,
} from "@/types/admin";

const STATUS_OPTIONS: AdminSupportTicketStatus[] = [
  "open",
  "in_progress",
  "waiting",
  "resolved",
  "closed",
];

const PRIORITY_OPTIONS: AdminSupportTicketPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export function FaraiAdminSupportDetail({ ticket }: { ticket: AdminSupportTicketDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignedTo, setAssignedTo] = useState(ticket.assignedTo ?? "");

  const saveTicketFields = (updates: {
    status?: AdminSupportTicketStatus;
    priority?: AdminSupportTicketPriority;
    assignedTo?: string | null;
  }) => {
    setError(null);
    startTransition(async () => {
      const result = await adminUpdateSupportTicket(ticket.id, updates);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const handleReply = () => {
    if (!reply.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await adminReplySupportTicket(ticket.id, reply, { isInternal });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReply("");
      router.refresh();
    });
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <Link
          href="/admin/support"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Support
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
            {formatTicketNumber(ticket.ticketNumber)}
          </p>
          <h1 className="truncate text-lg font-extrabold tracking-tight text-gray-900">{ticket.subject}</h1>
        </div>
        <AdminActivityBellLink />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {error ? (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">Issue description</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{ticket.description}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                <span>Created {ticket.createdAt}</span>
                {ticket.requesterName ? <span>· {ticket.requesterName}</span> : null}
                {ticket.requesterEmail ? <span>· {ticket.requesterEmail}</span> : null}
                {ticket.businessName && ticket.companyId ? (
                  <Link href={`${ADMIN_BUSINESSES_PATH}/${ticket.companyId}`} className="font-semibold text-indigo-600">
                    · {ticket.businessName}
                  </Link>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-50 px-6 py-4">
                <h2 className="text-sm font-bold text-gray-900">Conversation</h2>
              </div>
              {ticket.messages.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-400">No replies yet.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {ticket.messages.map((message) => (
                    <li key={message.id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-gray-900">
                          {message.authorName}
                          {message.isInternal ? (
                            <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              Internal
                            </span>
                          ) : null}
                        </p>
                        <span className="text-[10px] text-gray-400">{message.createdAt}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{message.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-gray-50 px-6 py-4">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-300"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    Internal note (not visible to customer)
                  </label>
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={isPending || !reply.trim()}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isPending ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">Ticket controls</h2>
              <div className="mt-4 space-y-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</span>
                  <select
                    value={status}
                    onChange={(e) => {
                      const next = e.target.value as AdminSupportTicketStatus;
                      setStatus(next);
                      saveTicketFields({ status: next });
                    }}
                    disabled={isPending}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-300"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Priority</span>
                  <select
                    value={priority}
                    onChange={(e) => {
                      const next = e.target.value as AdminSupportTicketPriority;
                      setPriority(next);
                      saveTicketFields({ priority: next });
                    }}
                    disabled={isPending}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium capitalize outline-none focus:border-indigo-300"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Assignee</span>
                  <select
                    value={assignedTo}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAssignedTo(next);
                      saveTicketFields({ assignedTo: next || null });
                    }}
                    disabled={isPending}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-300"
                  >
                    <option value="">Unassigned</option>
                    {ADMIN_DEVELOPER_OPTIONS.map((dev) => (
                      <option key={dev.id} value={dev.name}>
                        {dev.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {ticket.resolvedAt ? (
                <p className="mt-4 text-[10px] text-gray-400">Resolved {ticket.resolvedAt}</p>
              ) : null}
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
