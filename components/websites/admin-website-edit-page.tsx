"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ExternalLink, Eye, Store } from "lucide-react";

import {
  MARKETPLACE_LISTING_REQUIRES_PUBLISH,
} from "@/lib/marketplace/listing-eligibility";

import {
  connectDomainAsAdminAction,
  publishWebsiteAsAdminAction,
  unpublishWebsiteAsAdminAction,
  updateWebsiteSeoAsAdminAction,
} from "@/app/actions/websites";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { WorkspaceModeCallout } from "@/components/admin/workspace-mode-callout";
import { Button } from "@/components/ui/button";
import { WebsiteContentEditor } from "@/components/websites/website-content-editor";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { agencyWorkspaceHref } from "@/lib/platform/agency-workspace";
import { companyWebsiteBuilderPath } from "@/lib/paths/company";
import {
  resolveWebsiteLiveUrl,
  tenantSubdomainHost,
} from "@/lib/services/website-public-url";
import { cn } from "@/lib/utils";
import type { WebsiteContent } from "@/types/database";

type WebsiteSummary = {
  id: string;
  name: string;
  industry: string;
  template: string;
  status: "draft" | "published";
  domain: string | null;
  subdomain: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
};

type CompanySummary = {
  id: string;
  name: string;
  slug: string;
};

type MarketplaceSummary = {
  listed: boolean;
  summary: string | null;
  location: string | null;
  featured: boolean;
  slug: string;
};

type Props = {
  website: WebsiteSummary;
  company: CompanySummary | null;
  marketplace: MarketplaceSummary | null;
  contentRows: WebsiteContent[];
};

function statusBadge(status: WebsiteSummary["status"]) {
  if (status === "published") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        Published
      </span>
    );
  }
  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
      Draft
    </span>
  );
}

export function AdminWebsiteEditPage({
  website,
  company,
  marketplace,
  contentRows,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(website.status);
  const [domain, setDomain] = useState(website.domain ?? "");
  const [seoTitle, setSeoTitle] = useState(website.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(website.seoDescription ?? "");
  const [seoKeywords, setSeoKeywords] = useState(website.seoKeywords ?? "");

  const [publishPending, setPublishPending] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [domainPending, setDomainPending] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainMessage, setDomainMessage] = useState<string | null>(null);
  const [seoPending, setSeoPending] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [seoMessage, setSeoMessage] = useState<string | null>(null);

  const companySlug = company?.slug ?? "admin";
  const companyId = company?.id ?? "";
  const workspaceBuilderHref =
    company?.slug && company.slug !== "admin"
      ? agencyWorkspaceHref(company.slug, companyWebsiteBuilderPath(company.slug))
      : null;
  const previewPath = `/preview/${website.id}`;
  const live = resolveWebsiteLiveUrl({
    websiteId: website.id,
    domain,
    subdomain: website.subdomain,
  });
  const fallbackTenantHost = tenantSubdomainHost(website.subdomain);

  const onPublish = async () => {
    if (!companyId) {
      setPublishError("Website is not linked to a client company.");
      return;
    }
    setPublishPending(true);
    setPublishError(null);
    try {
      const result = await publishWebsiteAsAdminAction(
        website.id,
        companySlug,
        companyId
      );
      if (!result.ok) {
        setPublishError(result.error);
        return;
      }
      setStatus("published");
      router.refresh();
    } finally {
      setPublishPending(false);
    }
  };

  const onUnpublish = async () => {
    if (!companyId) {
      setPublishError("Website is not linked to a client company.");
      return;
    }
    setPublishPending(true);
    setPublishError(null);
    try {
      const result = await unpublishWebsiteAsAdminAction(
        website.id,
        companySlug,
        companyId
      );
      if (!result.ok) {
        setPublishError(result.error);
        return;
      }
      setStatus("draft");
      router.refresh();
    } finally {
      setPublishPending(false);
    }
  };

  const onConnectDomain = async (event: FormEvent) => {
    event.preventDefault();
    if (!companyId) {
      setDomainError("Website is not linked to a client company.");
      return;
    }
    setDomainPending(true);
    setDomainError(null);
    setDomainMessage(null);
    try {
      const result = await connectDomainAsAdminAction(
        website.id,
        domain,
        companySlug,
        companyId
      );
      if (!result.ok) {
        setDomainError(result.error);
        return;
      }
      setDomainMessage("Domain saved.");
      router.refresh();
    } finally {
      setDomainPending(false);
    }
  };

  const onSaveSeo = async (event: FormEvent) => {
    event.preventDefault();
    if (!companyId) {
      setSeoError("Website is not linked to a client company.");
      return;
    }
    setSeoPending(true);
    setSeoError(null);
    setSeoMessage(null);
    try {
      const result = await updateWebsiteSeoAsAdminAction(
        website.id,
        companySlug,
        companyId,
        { seoTitle, seoDescription, seoKeywords }
      );
      if (!result.ok) {
        setSeoError(result.error);
        return;
      }
      setSeoMessage("SEO settings saved.");
      router.refresh();
    } finally {
      setSeoPending(false);
    }
  };

  return (
    <AdminPageShell
      title={website.name}
      description={
        company
          ? `Client: ${company.name} · Tenant subdomain: ${fallbackTenantHost ?? "—"} (requires platform DNS)`
          : `Tenant subdomain: ${fallbackTenantHost ?? "—"} (requires platform DNS)`
      }
      actions={
        <>
          {statusBadge(status)}
          <Link href="/admin/websites" className={riseOutlineButtonClassName}>
            Back to websites
          </Link>
          {company ? (
            <Link
              href={`/admin/businesses/${company.id}?tab=pipeline`}
              className={riseOutlineButtonClassName}
            >
              View project
            </Link>
          ) : null}
          <Link href={previewPath} target="_blank" rel="noreferrer" className={riseOutlineButtonClassName}>
            <Eye className="h-4 w-4" />
            Preview
          </Link>
          {status === "published" ? (
            <a href={live.href} target="_blank" rel="noreferrer" className={riseOutlineButtonClassName}>
              <ExternalLink className="h-4 w-4" />
              Live site
            </a>
          ) : null}
        </>
      }
    >
      {company ? (
        <WorkspaceModeCallout
          featureLabel="website editing"
          companyId={company.id}
          companySlug={company.slug}
          companyName={company.name}
          workspaceHref={workspaceBuilderHref}
          className="mb-4"
        />
      ) : null}
      <div className={cn(riseCardClassName, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-center gap-3">
          {status === "draft" ? (
            <Button type="button" onClick={onPublish} disabled={publishPending || !companyId}>
              {publishPending ? "Publishing..." : "Publish website"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onUnpublish}
              disabled={publishPending || !companyId}
            >
              {publishPending ? "Updating..." : "Unpublish"}
            </Button>
          )}
          <p className="text-xs text-slate-500">
            {status === "draft"
              ? "Publishing makes the site visible on its domain or fallback host."
              : "Unpublish returns the site to draft — visitors will see “coming soon”."}
          </p>
        </div>
        {publishError ? (
          <p className="mt-3 text-sm font-medium text-red-600">{publishError}</p>
        ) : null}
      </div>

      <section className={cn(riseCardClassName, "p-5 sm:p-6")}>
        <h2 className="text-lg font-semibold text-slate-900">Domain &amp; SEO</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connect a custom domain and tune search metadata before launch.
        </p>

        <form onSubmit={onConnectDomain} className="mt-5 space-y-2 border-b border-slate-100 pb-5">
          <p className="text-sm font-medium text-slate-800">Custom domain</p>
          <p className="text-xs text-slate-500">
            After saving, point <strong>A</strong> records for <strong>@</strong> and{" "}
            <strong>www</strong> to your FaraiOS Plesk server IP in Website → Domains or Hosting.
            Without a custom domain, <strong>Live site</strong> opens the preview URL on this app
            ({live.source === "preview" ? live.href : "main app"}). The FaraiOS subdomain{" "}
            {fallbackTenantHost ? (
              <>
                <strong>{fallbackTenantHost}</strong>
              </>
            ) : (
              "above"
            )}{" "}
            only works after platform wildcard DNS (<code>*.faraios.com</code>) points to this app.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="www.clientbusiness.com"
              disabled={!companyId}
            />
            <Button type="submit" disabled={domainPending || !companyId}>
              {domainPending ? "Saving..." : "Save domain"}
            </Button>
          </div>
          {domainError ? (
            <p className="text-sm font-medium text-red-600">{domainError}</p>
          ) : null}
          {domainMessage ? (
            <p className="text-sm font-medium text-emerald-600">{domainMessage}</p>
          ) : null}
        </form>

        <form onSubmit={onSaveSeo} className="mt-5 space-y-3">
          <p className="text-sm font-medium text-slate-800">SEO settings</p>
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="SEO title"
            disabled={!companyId}
          />
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            rows={3}
            placeholder="SEO description"
            disabled={!companyId}
          />
          <input
            value={seoKeywords}
            onChange={(e) => setSeoKeywords(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="SEO keywords (comma-separated)"
            disabled={!companyId}
          />
          <Button type="submit" disabled={seoPending || !companyId}>
            {seoPending ? "Saving SEO..." : "Save SEO"}
          </Button>
          {seoError ? <p className="text-sm font-medium text-red-600">{seoError}</p> : null}
          {seoMessage ? (
            <p className="text-sm font-medium text-emerald-600">{seoMessage}</p>
          ) : null}
        </form>
      </section>

      <section className={cn(riseCardClassName, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <Store className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Marketplace</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Optional consumer discovery after the site is published. Listing controls live on
                the project page.
              </p>
            </div>
          </div>
          {marketplace?.listed ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Listed
            </span>
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Not listed
            </span>
          )}
        </div>

        {marketplace ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {marketplace.summary ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Summary
                </dt>
                <dd className="mt-1 text-slate-700">{marketplace.summary}</dd>
              </div>
            ) : null}
            {marketplace.location ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Location
                </dt>
                <dd className="mt-1 text-slate-700">{marketplace.location}</dd>
              </div>
            ) : null}
            {marketplace.featured ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Featured
                </dt>
                <dd className="mt-1 text-slate-700">Yes</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {status !== "published" ? (
          <p className="mt-4 text-sm text-amber-600">
            {MARKETPLACE_LISTING_REQUIRES_PUBLISH}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          {company ? (
            <a
              href={`/admin/pipeline/${company.id}#marketplace`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900"
            >
              Manage marketplace listing
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {marketplace?.listed && status === "published" ? (
            <Link
              href={`/marketplace/${marketplace.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              View public listing
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </section>

      <WebsiteContentEditor
        variant="admin"
        websiteId={website.id}
        companySlug={companySlug}
        previewPath={previewPath}
        websiteIndustry={website.industry}
        websiteTemplate={website.template}
        contentRows={contentRows}
        embedded
      />
    </AdminPageShell>
  );
}
