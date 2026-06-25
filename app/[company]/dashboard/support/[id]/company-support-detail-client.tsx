"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Send } from "lucide-react";

import { companyReplySupportTicket } from "@/app/actions/company-platform-ops";
import { companySupportPath } from "@/lib/paths/company";
import type { CompanySupportTicketDetail } from "@/lib/services/company-platform-ops";
import type { CompanyWithIndustry } from "@/types/database";

export function CompanySupportDetailClient({
  slug,
  company,
  ticket,
}: {
  slug: string;
  company: CompanyWithIndustry;
  ticket: CompanySupportTicketDetail;
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleReply = () => {
    if (!reply.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await companyReplySupportTicket({
        companyId: company.id,
        companySlug: slug,
        ticketId: ticket.id,
        body: reply,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReply("");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={companySupportPath(slug)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-violet-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to support
      </Link>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
          {ticket.ticketLabel}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{ticket.subject}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {ticket.status} · {ticket.category} · opened {ticket.createdAt}
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Issue details</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {ticket.description}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">Conversation</h2>
        </div>
        {ticket.messages.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">No replies yet. The FaraiOS team will respond here.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {ticket.messages.map((message) => (
              <li key={message.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-900">{message.authorName}</p>
                  <span className="text-[10px] text-slate-400">{message.createdAt}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-slate-100 px-5 py-4">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleReply}
              disabled={isPending || !reply.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isPending ? "Sending…" : "Send reply"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
