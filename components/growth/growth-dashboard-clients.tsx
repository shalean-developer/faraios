"use client";

import { useState, useTransition } from "react";

import {
  createCampaignAction,
  createContentPostAction,
  sendCampaignAction,
  sendReviewRequestAction,
  updateContentPostAction,
} from "@/app/actions/growth-engine";
import type { ContentPost, EmailCampaign, ReviewRequest } from "@/types/growth-engine";
import type { MarketingAnalytics } from "@/types/growth-engine";

export function MarketingOverviewClient({
  analytics,
}: {
  analytics: MarketingAnalytics;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Website visits (30d)" value={String(analytics.websiteVisits)} />
      <MetricCard label="Leads" value={String(analytics.leads)} />
      <MetricCard label="Bookings" value={String(analytics.bookings)} />
      <MetricCard label="Conversion rate" value={`${analytics.conversionRate}%`} />
      <MetricCard label="Quote requests" value={String(analytics.quoteRequests)} />
      <MetricCard label="Review requests sent" value={String(analytics.reviewRequestsSent)} />
      <MetricCard label="Campaign revenue" value={`R${(analytics.campaignRevenueCents / 100).toFixed(0)}`} />
    </div>
  );
}

export function AnalyticsDashboardClient({
  analytics,
}: {
  analytics: MarketingAnalytics;
}) {
  return (
    <div className="space-y-8">
      <MarketingOverviewClient analytics={analytics} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Top sources</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase text-slate-500">
              <th className="pb-2">Source</th>
              <th className="pb-2 text-right">Bookings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analytics.topSources.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-4 text-slate-500">No attribution data yet.</td>
              </tr>
            ) : (
              analytics.topSources.map((row) => (
                <tr key={row.source}>
                  <td className="py-2">{row.source}</td>
                  <td className="py-2 text-right font-medium">{row.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Top service pages</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase text-slate-500">
              <th className="pb-2">Page</th>
              <th className="pb-2 text-right">Visits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analytics.topServicePages.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-4 text-slate-500">No page visit data yet.</td>
              </tr>
            ) : (
              analytics.topServicePages.map((row) => (
                <tr key={row.page}>
                  <td className="py-2 font-mono text-xs">{row.page}</td>
                  <td className="py-2 text-right font-medium">{row.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Campaign performance</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase text-slate-500">
              <th className="pb-2">Campaign</th>
              <th className="pb-2 text-right">Sent</th>
              <th className="pb-2 text-right">Bookings</th>
              <th className="pb-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analytics.campaignPerformance.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-slate-500">No campaigns sent yet.</td>
              </tr>
            ) : (
              analytics.campaignPerformance.map((row) => (
                <tr key={row.name}>
                  <td className="py-2">{row.name}</td>
                  <td className="py-2 text-right">{row.sentCount}</td>
                  <td className="py-2 text-right">{row.bookingsGenerated}</td>
                  <td className="py-2 text-right">R{(row.revenueCents / 100).toFixed(0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function ReviewsClient({
  slug,
  companyId,
  companyName,
  requests,
}: {
  slug: string;
  companyId: string;
  companyName: string;
  requests: ReviewRequest[];
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function sendManual() {
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await sendReviewRequestAction({
        companyId,
        companySlug: slug,
        customerEmail: email.trim(),
        customerName: name.trim() || "there",
        businessName: companyName,
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage("Review request sent.");
        setEmail("");
        setName("");
      }
    });
  }

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Send manual review request</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            placeholder="Customer email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Customer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending}
            onClick={sendManual}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Send request
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Review request history</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase text-slate-500">
              <th className="pb-2">Customer</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-slate-500">No review requests yet.</td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td className="py-2">{r.customer_name || r.customer_email}</td>
                  <td className="py-2 capitalize">{r.status}</td>
                  <td className="py-2 text-slate-500">{new Date(r.sent_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function CampaignsClient({
  slug,
  companyId,
  campaigns,
}: {
  slug: string;
  companyId: string;
  campaigns: EmailCampaign[];
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    subject: "",
    bodyHtml: "<p>We have a special offer for you.</p>",
    campaignType: "promotion" as const,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function create() {
    startTransition(async () => {
      const result = await createCampaignAction({
        companyId,
        companySlug: slug,
        campaign: form,
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage("Campaign created.");
        setForm({ name: "", subject: "", bodyHtml: "<p>We have a special offer for you.</p>", campaignType: "promotion" });
      }
    });
  }

  function send(campaignId: string) {
    startTransition(async () => {
      const result = await sendCampaignAction({ companyId, companySlug: slug, campaignId });
      if (!result.ok) setError(result.error);
      else setMessage(`Campaign sent to ${result.sentCount ?? 0} customer(s).`);
    });
  }

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Create campaign</h2>
        <div className="mt-4 grid gap-3">
          <input placeholder="Campaign name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Email subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <textarea placeholder="Email body (HTML)" value={form.bodyHtml} onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))} rows={5} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" disabled={pending} onClick={create} className="w-fit rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
            Create draft
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Campaigns</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase text-slate-500">
              <th className="pb-2">Name</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Status</th>
              <th className="pb-2 text-right">Sent</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-slate-500">No campaigns yet.</td></tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 capitalize">{c.campaign_type.replace(/_/g, " ")}</td>
                  <td className="py-2 capitalize">{c.status}</td>
                  <td className="py-2 text-right">{c.sent_count}</td>
                  <td className="py-2">
                    {c.status === "draft" ? (
                      <button type="button" disabled={pending} onClick={() => send(c.id)} className="text-violet-700 hover:underline disabled:opacity-50">
                        Send to customers
                      </button>
                    ) : (
                      <span className="text-slate-400">Sent</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function ContentClient({
  slug,
  companyId,
  posts,
}: {
  slug: string;
  companyId: string;
  posts: ContentPost[];
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    contentBody: "",
    category: "blog" as const,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function create() {
    if (!form.title.trim()) return;
    startTransition(async () => {
      const result = await createContentPostAction({
        companyId,
        companySlug: slug,
        post: form,
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage("Post created as draft.");
        setForm({ title: "", contentBody: "", category: "blog" });
      }
    });
  }

  function publish(postId: string) {
    startTransition(async () => {
      const result = await updateContentPostAction({
        companyId,
        companySlug: slug,
        postId,
        post: { status: "published" },
      });
      if (!result.ok) setError(result.error);
      else setMessage("Post published.");
    });
  }

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">New post</h2>
        <div className="mt-4 grid gap-3">
          <input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof form.category }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="blog">Blog</option>
            <option value="guide">Guide</option>
            <option value="service_article">Service article</option>
            <option value="faq">FAQ</option>
          </select>
          <textarea placeholder="Content" value={form.contentBody} onChange={(e) => setForm((f) => ({ ...f, contentBody: e.target.value }))} rows={6} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" disabled={pending} onClick={create} className="w-fit rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
            Create draft
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Content library</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase text-slate-500">
              <th className="pb-2">Title</th>
              <th className="pb-2">Category</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {posts.length === 0 ? (
              <tr><td colSpan={4} className="py-4 text-slate-500">No content yet.</td></tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{p.title}</td>
                  <td className="py-2 capitalize">{p.category.replace(/_/g, " ")}</td>
                  <td className="py-2 capitalize">{p.status}</td>
                  <td className="py-2">
                    {p.status === "draft" ? (
                      <button type="button" disabled={pending} onClick={() => publish(p.id)} className="text-violet-700 hover:underline disabled:opacity-50">
                        Publish
                      </button>
                    ) : (
                      <span className="text-slate-400">Live</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
