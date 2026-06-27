"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  ExternalLink,
  MousePointerClick,
  Search,
  Send,
  Settings,
  Star,
  type LucideIcon,
} from "lucide-react";

import { sendReviewRequestAction } from "@/app/actions/growth-engine";
import { companyMarketingPath, companySeoPath } from "@/lib/paths/company";
import type { ReviewRequestSummary } from "@/lib/services/review-requests";
import {
  riseCardClassName,
  riseFooterToneClass,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
  riseStretchCardClassName,
  type RiseFooterTone,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import type { ReviewRequest } from "@/types/growth-engine";

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

function MetricCard({
  title,
  value,
  footer,
  footerTone,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string;
  footer: string;
  footerTone: RiseFooterTone;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="min-w-[10.5rem] flex-1 rounded-xl border border-slate-200 bg-white p-4 sm:min-w-[11rem] lg:min-w-0">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            iconBg
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", iconColor)} strokeWidth={1.75} />
        </span>
        <p className="min-w-0 line-clamp-2 text-xs font-semibold leading-tight text-slate-900">
          {title}
        </p>
      </div>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className={cn("mt-1 truncate text-xs font-medium", riseFooterToneClass[footerTone])}>
        {footer}
      </p>
    </div>
  );
}

function statusBadgeClass(status: ReviewRequest["status"]): string {
  if (status === "clicked") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-[#eef2ff] group-hover:text-[#5a8dee]">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#5a8dee]" />
    </Link>
  );
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

  const seoPath = companySeoPath(slug);

  const metricCards = [
    {
      title: "Total requests",
      value: String(summary.total),
      footer: "Last 50 shown",
      footerTone: summary.total > 0 ? ("positive" as const) : ("neutral" as const),
      icon: Send,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Awaiting click",
      value: String(summary.sent),
      footer: "Sent, not opened",
      footerTone: summary.sent > 0 ? ("warning" as const) : ("neutral" as const),
      icon: Star,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Clicked",
      value: String(summary.clicked),
      footer: "Opened review link",
      footerTone: summary.clicked > 0 ? ("positive" as const) : ("neutral" as const),
      icon: MousePointerClick,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Click rate",
      value: `${summary.clickRate}%`,
      footer: "Of delivered requests",
      footerTone: summary.clickRate >= 20 ? ("positive" as const) : ("neutral" as const),
      icon: Star,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
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
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-medium text-slate-800">Review requests</h1>
            <p className="mt-1 text-sm text-slate-500">
              Send Google review requests, track clicks, and automate follow-ups after completed
              bookings.
            </p>
          </div>
          <Link href={seoPath} className={risePrimaryButtonClassName}>
            Configure review link
          </Link>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="mt-4 flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {metricCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="flex flex-col gap-4">
          <section className={riseCardClassName}>
            <WidgetHeader icon={Send} title="Send review request" />
            <div className="p-4">
              <p className="text-sm text-slate-500">
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
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
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
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={pending || !googleReviewLink}
                onClick={sendManual}
                className={cn(risePrimaryButtonClassName, "mt-4 disabled:opacity-50")}
              >
                {pending ? "Sending…" : "Send request"}
              </button>
            </div>
          </section>

          <section className={riseCardClassName}>
            <WidgetHeader icon={Star} title="Request history" />
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              Manual and automated review outreach for {companyName}.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                        No review requests yet. Send one above or enable auto-requests after
                        bookings.
                      </td>
                    </tr>
                  ) : (
                    requests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {request.customer_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{request.customer_email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                              statusBadgeClass(request.status)
                            )}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
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

        <aside className="flex flex-col gap-4">
          <section className={riseStretchCardClassName}>
            <WidgetHeader icon={Settings} title="Configuration" />
            <div className="flex flex-1 flex-col p-4">
              <dl className="space-y-3 text-sm">
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
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#5a8dee] hover:text-[#4a6fd8]"
                >
                  Preview review link <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link href={seoPath} className={cn(riseOutlineButtonClassName, "mt-4")}>
                  Set up review link
                </Link>
              )}
            </div>
          </section>

          <section className={riseStretchCardClassName}>
            <WidgetHeader icon={Search} title="Related" />
            <div className="grid gap-2 p-4">
              <SidebarLink href={seoPath} icon={Search} label="SEO & review link" />
              <SidebarLink
                href={companyMarketingPath(slug)}
                icon={Settings}
                label="Marketing overview"
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
