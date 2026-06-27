"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LifeBuoy, Plus, type LucideIcon } from "lucide-react";

import { companyCreateSupportTicket } from "@/app/actions/company-platform-ops";
import { companySupportTicketPath } from "@/lib/paths/company";
import type { CompanySupportTicketRow } from "@/lib/services/company-platform-ops";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type { CompanyWithIndustry } from "@/types/database";

function WidgetHeader({
  icon: Icon,
  title,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
        ) : null}
        <h2 className="truncate text-sm font-medium text-slate-700">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function CompanySupportClient({
  slug,
  company,
  tickets,
}: {
  slug: string;
  company: CompanyWithIndustry;
  tickets: CompanySupportTicketRow[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"general" | "billing" | "technical" | "account">("general");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await companyCreateSupportTicket({
        companyId: company.id,
        companySlug: slug,
        subject,
        description,
        category,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSubject("");
      setDescription("");
      setShowForm(false);
      if (result.ticketId) {
        router.push(companySupportTicketPath(slug, result.ticketId));
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-800">Platform support</h1>
            <p className="mt-1 text-sm text-slate-500">
              Contact the FaraiOS team about billing, technical issues, or your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className={risePrimaryButtonClassName}
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            New ticket
          </button>
        </div>

        {error ? (
          <p
            className="mx-4 mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {showForm ? (
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
            <h2 className="text-sm font-medium text-slate-700">Open a support ticket</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#5a8dee]"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#5a8dee]"
              >
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
              </select>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you need help with..."
                rows={4}
                className="md:col-span-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#5a8dee]"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className={riseOutlineButtonClassName}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending}
                className={risePrimaryButtonClassName}
              >
                {isPending ? "Submitting…" : "Submit ticket"}
              </button>
            </div>
          </div>
        ) : null}

        <WidgetHeader icon={LifeBuoy} title="Your tickets" />
        {tickets.length === 0 ? (
          <div className="py-16 text-center">
            <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No support tickets yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={companySupportTicketPath(slug, ticket.id)}
                  className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      {ticket.ticketLabel}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">{ticket.subject}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {ticket.status} · {ticket.category} · updated {ticket.updatedAt}
                    </p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold capitalize text-slate-600">
                    {ticket.priority}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
