"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createRetentionCampaignAction,
  runRetentionCampaignAction,
  toggleRetentionCampaignAction,
} from "@/app/actions/phase-c";
import { Button } from "@/components/ui/button";
import { companyCampaignsPath } from "@/lib/paths/company";
import { DEFAULT_CUSTOMER_SEGMENTS } from "@/lib/customers/segment-definitions";
import type { RetentionCampaignRecord } from "@/lib/services/retention-campaigns";
import type { CustomerSegment } from "@/types/v6-engine";

const CAMPAIGN_TYPES = [
  { value: "win_back", label: "Win-back" },
  { value: "service_reminder", label: "Service reminder" },
  { value: "seasonal", label: "Seasonal" },
  { value: "loyalty", label: "Loyalty" },
] as const;

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
    bodyHtml: "<p>Hi there,</p><p>It has been a while since your last booking. We have availability this week — reply or book online anytime.</p>",
  });

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
    <div className="space-y-8">
      {!emailConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Email provider is not configured. Set RESEND_API_KEY and BOOKING_FROM_EMAIL to send campaigns.
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Create retention campaign</h2>
        <p className="mt-1 text-sm text-slate-600">
          Target a customer segment with a win-back or reminder email.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Campaign name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
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
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
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
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
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
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Email body (HTML)</span>
            <textarea
              value={form.bodyHtml}
              onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
              rows={5}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
            />
          </label>
        </div>
        <Button type="button" className="mt-4 rounded-xl" disabled={pending || !form.name.trim()} onClick={onCreate}>
          Save campaign
        </Button>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Saved campaigns</h2>
          <Link href={companyCampaignsPath(slug)} className="text-sm font-medium text-violet-700">
            All email campaigns →
          </Link>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mb-3 text-sm text-emerald-700">{message}</p> : null}

        {campaigns.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            No retention campaigns yet. Start with the inactive segment (
            {segments.find((s) => s.segmentType === "inactive")?.customerCount ?? 0} customers).
          </p>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((campaign) => {
              const segmentLabel =
                segments.find((s) => s.segmentType === campaign.segmentType)?.name ??
                DEFAULT_CUSTOMER_SEGMENTS.find((s) => s.segmentType === campaign.segmentType)?.name ??
                campaign.segmentType ??
                "Segment";
              return (
                <li
                  key={campaign.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
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
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => onToggle(campaign.id, !campaign.enabled)}
                    >
                      {campaign.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending || !emailConfigured}
                      onClick={() => onRun(campaign.id)}
                    >
                      Run now
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
