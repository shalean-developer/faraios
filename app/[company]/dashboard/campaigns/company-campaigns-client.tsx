"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  BarChart3,
  DollarSign,
  Mail,
  PenLine,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";

import { createCampaignAction, sendCampaignAction } from "@/app/actions/growth-engine";
import {
  companyCustomersPath,
  companyMarketingPath,
  companyRetentionCampaignsPath,
} from "@/lib/paths/company";
import type { EmailCampaignSummary } from "@/lib/services/email-campaigns";
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
import type { CampaignType, EmailCampaign } from "@/types/growth-engine";

const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: "promotion", label: "Promotion" },
  { value: "follow_up", label: "Follow-up" },
  { value: "reactivation", label: "Reactivation" },
  { value: "seasonal", label: "Seasonal" },
  { value: "reminder", label: "Reminder" },
];

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

function statusBadgeClass(status: EmailCampaign["status"]): string {
  if (status === "sent") return "bg-emerald-50 text-emerald-700";
  if (status === "scheduled") return "bg-amber-50 text-amber-700";
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

export function CompanyCampaignsClient({
  slug,
  companyId,
  campaigns,
  summary,
  audienceCount,
  emailConfigured,
}: {
  slug: string;
  companyId: string;
  campaigns: EmailCampaign[];
  summary: EmailCampaignSummary;
  audienceCount: number;
  emailConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    subject: "",
    bodyHtml: "<p>We have a special offer for you.</p>",
    campaignType: "promotion" as CampaignType,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const metricCards = [
    {
      title: "Total campaigns",
      value: String(summary.total),
      footer: "All time",
      footerTone: summary.total > 0 ? ("positive" as const) : ("neutral" as const),
      icon: Mail,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Drafts",
      value: String(summary.drafts),
      footer: "Ready to send",
      footerTone: summary.drafts > 0 ? ("warning" as const) : ("neutral" as const),
      icon: PenLine,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Emails sent",
      value: String(summary.totalSent),
      footer: "Across sent campaigns",
      footerTone: summary.totalSent > 0 ? ("positive" as const) : ("neutral" as const),
      icon: Send,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Campaign revenue",
      value: `R${(summary.totalRevenueCents / 100).toFixed(0)}`,
      footer: "Attributed revenue",
      footerTone: summary.totalRevenueCents > 0 ? ("positive" as const) : ("neutral" as const),
      icon: DollarSign,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
  ];

  function create() {
    if (!form.name.trim() || !form.subject.trim()) {
      setError("Campaign name and subject are required.");
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await createCampaignAction({
        companyId,
        companySlug: slug,
        campaign: form,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Campaign created as draft.");
      setForm({
        name: "",
        subject: "",
        bodyHtml: "<p>We have a special offer for you.</p>",
        campaignType: "promotion",
      });
      router.refresh();
    });
  }

  function send(campaign: EmailCampaign) {
    if (
      !window.confirm(
        `Send "${campaign.name}" to up to ${audienceCount} customer(s) with email addresses?`
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await sendCampaignAction({
        companyId,
        companySlug: slug,
        campaignId: campaign.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Campaign sent to ${result.sentCount ?? 0} customer(s).`);
      router.refresh();
    });
  }

  return (
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-medium text-slate-800">Email campaigns</h1>
            <p className="mt-1 text-sm text-slate-500">
              Send promotions, follow-ups, and reactivation emails to your customer list.
            </p>
          </div>
          <div className="flex shrink-0 flex-row flex-nowrap items-center gap-2">
            <Link href={companyRetentionCampaignsPath(slug)} className={riseOutlineButtonClassName}>
              Retention campaigns
            </Link>
            <Link href={companyCustomersPath(slug)} className={risePrimaryButtonClassName}>
              Manage customers
            </Link>
          </div>
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
            <WidgetHeader icon={PenLine} title="Create campaign" />
            <div className="p-4">
              <p className="text-sm text-slate-500">
                Draft an email to send to customers who have not unsubscribed.
              </p>
              {!emailConfigured ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Email delivery is not configured on this server (Resend). You can still create
                  drafts, but sending will fail until email is set up.
                </div>
              ) : null}
              <div className="mt-4 grid gap-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Campaign name
                  </span>
                  <input
                    placeholder="Spring promotion"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-400">Type</span>
                  <select
                    value={form.campaignType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, campaignType: e.target.value as CampaignType }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    {CAMPAIGN_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Email subject
                  </span>
                  <input
                    placeholder="Your exclusive offer inside"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Email body (HTML)
                  </span>
                  <textarea
                    value={form.bodyHtml}
                    onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
                    rows={6}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
                  />
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={create}
                  className={cn(risePrimaryButtonClassName, "disabled:opacity-50")}
                >
                  Create draft
                </button>
              </div>
            </div>
          </section>

          <section className={riseCardClassName}>
            <WidgetHeader icon={Mail} title="Campaign library" />
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              Draft campaigns can be sent once. Sent campaigns are read-only.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Sent</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        No campaigns yet. Create your first draft above.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{campaign.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{campaign.subject}</p>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {campaign.campaign_type.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                              statusBadgeClass(campaign.status)
                            )}
                          >
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{campaign.sent_count}</td>
                        <td className="px-4 py-3 text-right">
                          R{(campaign.revenue_generated_cents / 100).toFixed(0)}
                        </td>
                        <td className="px-4 py-3">
                          {campaign.status === "draft" ? (
                            <button
                              type="button"
                              disabled={pending || audienceCount === 0}
                              onClick={() => send(campaign)}
                              className="font-medium text-[#5a8dee] hover:text-[#4a6fd8] disabled:opacity-50"
                            >
                              Send
                            </button>
                          ) : (
                            <span className="text-slate-400">
                              {campaign.sent_at
                                ? new Date(campaign.sent_at).toLocaleDateString()
                                : "—"}
                            </span>
                          )}
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
            <WidgetHeader icon={Users} title="Audience" />
            <div className="flex flex-1 flex-col p-4">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Reachable customers</dt>
                  <dd className="font-medium text-slate-900">{audienceCount}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Sent campaigns</dt>
                  <dd className="font-medium text-slate-900">{summary.sent}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Email delivery</dt>
                  <dd className="font-medium text-slate-900">
                    {emailConfigured ? "Configured" : "Not configured"}
                  </dd>
                </div>
              </dl>
              {audienceCount === 0 ? (
                <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                  Add customers with email addresses to send campaigns. Unsubscribed contacts are
                  excluded automatically.
                </p>
              ) : null}
            </div>
          </section>

          <section className={riseStretchCardClassName}>
            <WidgetHeader icon={BarChart3} title="Related" />
            <div className="grid gap-2 p-4">
              <SidebarLink href={companyCustomersPath(slug)} icon={Users} label="Customers" />
              <SidebarLink
                href={companyMarketingPath(slug)}
                icon={BarChart3}
                label="Marketing overview"
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
