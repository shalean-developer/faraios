"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, ExternalLink, Search, Settings } from "lucide-react";

import { sendReviewRequestAction } from "@/app/actions/growth-engine";
import { cn } from "@/lib/utils";
import type { ReviewRequest } from "@/types/growth-engine";
import type { ReviewRequestSummary } from "@/lib/services/review-requests";

function MetricCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        highlight
          ? "border-2 border-violet-200 bg-gradient-to-br from-violet-50/70 to-white"
          : "border-slate-200 bg-white"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function statusBadgeClass(status: ReviewRequest["status"]): string {
  if (status === "clicked") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

export function CompanyReviewsClient({
  slug,
  companyId,
  companyName,
  requests,
  summary,
  googleReviewLink,
  autoReviewRequestEnabled,
}: {
  slug: string;
  companyId: string;
  companyName: string;
  requests: ReviewRequest[];
  summary: ReviewRequestSummary;
  googleReviewLink: string | null;
  autoReviewRequestEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seoPath = `/${encodeURIComponent(slug)}/dashboard/seo`;

  const statCards = [
    { label: "Total requests", value: String(summary.total), hint: "Last 50 shown" },
    { label: "Awaiting click", value: String(summary.sent), hint: "Sent, not opened" },
    { label: "Clicked", value: String(summary.clicked), hint: "Opened review link" },
    {
      label: "Click rate",
      value: `${summary.clickRate}%`,
      hint: "Of delivered requests",
      highlight: true,
    },
  ];

  function sendManual() {
    if (!email.trim()) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await sendReviewRequestAction({
        companyId,
        companySlug: slug,
        customerEmail: email.trim(),
        customerName: name.trim() || "there",
        businessName: companyName,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Review request sent.");
      setEmail("");
      setName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Send review request</h2>
            <p className="mt-1 text-sm text-slate-500">
              Email a customer with a tracked link to your Google review page.
            </p>
            {!googleReviewLink ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Add your Google review link in{" "}
                <Link href={seoPath} className="font-semibold underline">
                  SEO settings
                </Link>{" "}
                before sending requests.
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-400">
                  Customer email
                </span>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-400">
                  Customer name
                </span>
                <input
                  placeholder="Optional"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={pending || !googleReviewLink}
              onClick={sendManual}
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send request"}
            </button>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Request history</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manual and automated review outreach for {companyName}.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                        No review requests yet. Send one above or enable auto-requests after
                        bookings.
                      </td>
                    </tr>
                  ) : (
                    requests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {request.customer_name || "—"}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{request.customer_email}</td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                              statusBadgeClass(request.status)
                            )}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {new Date(request.sent_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Configuration</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Google review link</dt>
                <dd className="font-medium text-slate-900">
                  {googleReviewLink ? "Configured" : "Missing"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Auto after booking</dt>
                <dd className="font-medium text-slate-900">
                  {autoReviewRequestEnabled ? "On" : "Off"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Failed sends</dt>
                <dd className="font-medium text-slate-900">{summary.failed}</dd>
              </div>
            </dl>
            {googleReviewLink ? (
              <a
                href={googleReviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
              >
                Preview review link <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Related</h3>
            <ul className="mt-3 space-y-1">
              <SidebarLink href={seoPath} icon={Search} label="SEO & review link" />
              <SidebarLink
                href={`/${encodeURIComponent(slug)}/dashboard/marketing`}
                icon={Settings}
                label="Marketing overview"
              />
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-violet-800"
      >
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        {label}
        <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" />
      </Link>
    </li>
  );
}
