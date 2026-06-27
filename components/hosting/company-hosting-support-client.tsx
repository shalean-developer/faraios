"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HostingStatusBadge } from "@/components/hosting/hosting-shared-ui";
import { CompanyHostingLegacyBanner } from "@/components/hosting/company-hosting-legacy-banner";
import { Button } from "@/components/ui/button";
import { createHostingSupportTicketAction } from "@/app/actions/hosting-automation";
import type { HostingServiceRow, HostingSupportTicketRow } from "@/types/hosting-automation";

export function CompanyHostingSupportClient({
  slug,
  companyId,
  services,
  tickets,
  hasLegacySubscription = false,
}: {
  slug: string;
  companyId: string;
  services: HostingServiceRow[];
  tickets: HostingSupportTicketRow[];
  hasLegacySubscription?: boolean;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createHostingSupportTicketAction({
        companyId,
        companySlug: slug,
        serviceId: serviceId || undefined,
        subject,
        message,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSubject("");
      setMessage("");
      setSuccess("Support ticket opened. Our team will respond by email.");
      router.refresh();
    });
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hosting support</h1>
      <p className="mt-2 text-sm text-slate-500">Open a ticket for hosting or domain issues.</p>

      <CompanyHostingLegacyBanner
        slug={slug}
        hasLegacySubscription={hasLegacySubscription}
        hasAutomationServices={services.length > 0}
      />

      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <label className="block text-xs font-semibold text-slate-600">
          Related service
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">General hosting</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.domain_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Subject
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Message
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}
        <Button disabled={pending || !subject || !message} onClick={submit}>
          Open ticket
        </Button>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No support tickets yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">{ticket.subject}</p>
                  <HostingStatusBadge status={ticket.status} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {ticket.department} · {ticket.priority}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
