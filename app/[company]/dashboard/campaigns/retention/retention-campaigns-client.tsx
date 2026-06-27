"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail, PenLine, RefreshCw, Users, type LucideIcon } from "lucide-react";

import {
  createRetentionCampaignAction,
  runRetentionCampaignAction,
  toggleRetentionCampaignAction,
} from "@/app/actions/phase-c";
import {
  companyCampaignsPath,
  companyDashboardPath,
} from "@/lib/paths/company";
import { DEFAULT_CUSTOMER_SEGMENTS } from "@/lib/customers/segment-definitions";
import type { RetentionCampaignRecord } from "@/lib/services/retention-campaigns";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
  riseStretchCardClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import type { CustomerSegment } from "@/types/v6-engine";

const CAMPAIGN_TYPES = [
  { value: "win_back", label: "Win-back" },
  { value: "service_reminder", label: "Service reminder" },
  { value: "seasonal", label: "Seasonal" },
  { value: "loyalty", label: "Loyalty" },
] as const;

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

export function RetentionCampaignsClient({
  slug,
  companyId,
  campaigns,
  segments,
  emailConfigured,
}: {
  slug: string;
  companyId: string;
  campaigns: RetentionCampaignRecord[];
  segments: CustomerSegment[];
  emailConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    campaignType: "win_back" as (typeof CAMPAIGN_TYPES)[number]["value"],
    segmentType: "inactive",
    subject: "We would love to see you again",
    bodyHtml:
      "<p>Hi there,</p><p>It has been a while since your last booking. We have availability this week — reply or book online anytime.</p>",
  });

  const inactiveCount =
    segments.find((s) => s.segmentType === "inactive")?.customerCount ?? 0;

  const onCreate = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createRetentionCampaignAction({
        companyId,
        companySlug: slug,
        ...form,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Retention campaign created.");
      setForm((current) => ({ ...current, name: "" }));
      router.refresh();
    });
  };

  const onRun = (campaignId: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await runRetentionCampaignAction({
        companyId,
        companySlug: slug,
        campaignId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Campaign sent to ${result.sentCount ?? 0} customers.`);
      router.refresh();
    });
  };

  const onToggle = (campaignId: string, enabled: boolean) => {
    startTransition(async () => {
      await toggleRetentionCampaignAction({
        companyId,
        companySlug: slug,
        campaignId,
        enabled,
      });
      router.refresh();
    });
  };

  return (
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-medium text-slate-800">Retention campaigns</h1>
            <p className="mt-1 text-sm text-slate-500">
              Win back inactive customers and send targeted reactivation emails by segment.
            </p>
          </div>
          <div className="flex shrink-0 flex-row flex-nowrap items-center gap-2">
            <Link href={companyCampaignsPath(slug)} className={riseOutlineButtonClassName}>
              Email campaigns
            </Link>
            <Link href={companyDashboardPath(slug)} className={riseOutlineButtonClassName}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {!emailConfigured ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Email provider is not configured. Set RESEND_API_KEY and BOOKING_FROM_EMAIL to send
          campaigns.
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="flex flex-col gap-4">
          <section className={riseCardClassName}>
            <WidgetHeader icon={PenLine} title="Create retention campaign" />
            <div className="p-4">
              <p className="text-sm text-slate-500">
                Target a customer segment with a win-back or reminder email.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Campaign name</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Inactive customer win-back"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Type</span>
                  <select
                    value={form.campaignType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        campaignType: e.target.value as typeof form.campaignType,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    {CAMPAIGN_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Segment</span>
                  <select
                    value={form.segmentType}
                    onChange={(e) => setForm({ ...form, segmentType: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    {segments.map((segment) => (
                      <option key={segment.segmentType} value={segment.segmentType}>
                        {segment.name} ({segment.customerCount})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Email subject</span>
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Email body (HTML)</span>
                  <textarea
                    value={form.bodyHtml}
                    onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                    rows={5}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                  />
                </label>
              </div>
              <button
                type="button"
                className={cn(risePrimaryButtonClassName, "mt-4 disabled:opacity-50")}
                disabled={pending || !form.name.trim()}
                onClick={onCreate}
              >
                Save campaign
              </button>
            </div>
          </section>

          <section className={riseCardClassName}>
            <WidgetHeader
              icon={Mail}
              title="Saved campaigns"
              action={
                <Link
                  href={companyCampaignsPath(slug)}
                  className="text-xs font-medium text-[#5a8dee] hover:text-[#4a6fd8]"
                >
                  All email campaigns →
                </Link>
              }
            />
            <div className="p-4">
              {campaigns.length === 0 ? (
                <p className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-500">
                  No retention campaigns yet. Start with the inactive segment ({inactiveCount}{" "}
                  customers).
                </p>
              ) : (
                <ul className="space-y-3">
                  {campaigns.map((campaign) => {
                    const segmentLabel =
                      segments.find((s) => s.segmentType === campaign.segmentType)?.name ??
                      DEFAULT_CUSTOMER_SEGMENTS.find(
                        (s) => s.segmentType === campaign.segmentType
                      )?.name ??
                      campaign.segmentType ??
                      "Segment";
                    return (
                      <li
                        key={campaign.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{campaign.name}</p>
                          <p className="text-sm text-slate-500">
                            {campaign.campaignType.replace(/_/g, " ")} · {segmentLabel}
                            {campaign.lastRunAt
                              ? ` · Last run ${new Date(campaign.lastRunAt).toLocaleDateString("en-ZA")}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={riseOutlineButtonClassName}
                            disabled={pending}
                            onClick={() => onToggle(campaign.id, !campaign.enabled)}
                          >
                            {campaign.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            className={cn(risePrimaryButtonClassName, "disabled:opacity-50")}
                            disabled={pending || !emailConfigured}
                            onClick={() => onRun(campaign.id)}
                          >
                            Run now
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className={riseStretchCardClassName}>
            <WidgetHeader icon={Users} title="Segments" />
            <div className="flex flex-1 flex-col p-4">
              <dl className="space-y-3 text-sm">
                {segments.slice(0, 5).map((segment) => (
                  <div key={segment.segmentType} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{segment.name}</dt>
                    <dd className="font-medium text-slate-900">{segment.customerCount}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                Inactive segment has {inactiveCount} customers available for win-back campaigns.
              </p>
            </div>
          </section>

          <section className={riseStretchCardClassName}>
            <WidgetHeader icon={RefreshCw} title="Tips" />
            <div className="flex flex-1 flex-col p-4 text-xs leading-relaxed text-slate-500">
              <p>
                Enable campaigns to queue them for scheduled runs, or use Run now for immediate
                delivery to the selected segment.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
