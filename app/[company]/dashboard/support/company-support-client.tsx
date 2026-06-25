"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LifeBuoy, Plus } from "lucide-react";

import { companyCreateSupportTicket } from "@/app/actions/company-platform-ops";
import { companySupportTicketPath } from "@/lib/paths/company";
import type { CompanySupportTicketRow } from "@/lib/services/company-platform-ops";
import type { CompanyWithIndustry } from "@/types/database";

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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform support</h1>
          <p className="mt-1 text-sm text-slate-500">
            Contact the FaraiOS team about billing, technical issues, or your account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          New ticket
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-5">
          <h2 className="text-sm font-bold text-slate-900">Open a support ticket</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400"
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
              className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Submitting…" : "Submit ticket"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">Your tickets</h2>
        </div>
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
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
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
      </section>
    </div>
  );
}
