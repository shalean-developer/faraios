"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";

import { companyReplySupportTicket } from "@/app/actions/company-platform-ops";
import { companySupportPath } from "@/lib/paths/company";
import type { CompanySupportTicketDetail } from "@/lib/services/company-platform-ops";
import {
  riseCardClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";

function WidgetHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <h2 className="text-sm font-medium text-slate-700">{title}</h2>
    </div>
  );
}

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
    <div className={risePageClassName}>
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href={companySupportPath(slug)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#4a6fd8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to support
        </Link>

        <div className={riseCardClassName}>
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {ticket.ticketLabel}
            </p>
            <h1 className="mt-1 text-lg font-medium text-slate-800">{ticket.subject}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {ticket.status} · {ticket.category} · opened {ticket.createdAt}
            </p>
          </div>

          {error ? (
            <p
              className="mx-4 mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <WidgetHeader title="Issue details" />
          <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-slate-700 sm:px-5">
            {ticket.description}
          </p>
        </div>

        <div className={cn(riseCardClassName, "overflow-hidden")}>
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <MessageSquare className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
            <h2 className="text-sm font-medium text-slate-700">Conversation</h2>
          </div>
          {ticket.messages.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500 sm:px-5">
              No replies yet. The FaraiOS team will respond here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ticket.messages.map((message) => (
                <li key={message.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-900">{message.authorName}</p>
                    <span className="text-[10px] text-slate-400">{message.createdAt}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#5a8dee]"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleReply}
                disabled={isPending || !reply.trim()}
                className={risePrimaryButtonClassName}
              >
                <Send className="h-4 w-4" strokeWidth={1.75} />
                {isPending ? "Sending…" : "Send reply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
