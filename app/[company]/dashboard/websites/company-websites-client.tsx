"use client";

import Link from "next/link";
import {
  ArrowRight,
  Globe,
  Hammer,
  Key,
  LineChart,
  Link2,
  Plus,
  Server,
  Wrench,
} from "lucide-react";

import { PreviewWebsiteButton } from "@/components/websites/preview-website-button";
import { BookingWidgetInstallSummary } from "@/components/company/booking-widget-install-summary";
import { WebsiteSetupChecklistPanel } from "@/components/websites/website-setup-checklist";
import {
  companyHostingPath,
  companyProjectPath,
  companyWebsiteApiKeysPath,
  companyWebsiteBuilderPath,
  companyWebsiteConnectionPath,
  companyWebsiteCreatePath,
  companyWebsiteDomainsPath,
  companyWebsiteEditPath,
  companyWebsiteTrackingPath,
} from "@/lib/paths/company";
import type { BusinessWebProperty, WebsiteHubSummary } from "@/lib/services/business-websites";
import type { WebsiteSetupChecklist } from "@/lib/services/website-checklist";
import {
  connectionStatusColor,
  connectionStatusLabel,
} from "@/lib/websites/status";
import { cn } from "@/lib/utils";
import type { ConnectedWebsite, HostingSubscription, Website } from "@/types/database";
import type { WebsiteDomain } from "@/types/website-engine";

type TrackingEvent = {
  id: string;
  event_type: string;
  source_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  created_at: string;
};

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm", className)}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CompanyWebsitesClient({
  slug,
  websites,
  hasWebsiteProject,
  connectedWebsite,
  hosting,
  domains,
  properties,
  checklist,
  summary,
  recentEvents,
  companyId,
}: {
  slug: string;
  companyId: string;
  websites: Website[];
  hasWebsiteProject: boolean;
  connectedWebsite: ConnectedWebsite | null;
  hosting: HostingSubscription | null;
  domains: WebsiteDomain[];
  properties: BusinessWebProperty[];
  checklist: WebsiteSetupChecklist;
  summary: WebsiteHubSummary;
  recentEvents: TrackingEvent[];
}) {
  const statCards = [
    {
      label: "Setup progress",
      value: `${summary.setupPercent}%`,
      hint: `${checklist.completedCount} of ${checklist.totalCount} steps complete`,
    },
    {
      label: "Hosted sites",
      value: String(summary.hostedCount),
      hint: summary.hostedCount ? "Managed in FaraiOS" : "Create or connect a site",
    },
    {
      label: "Domains",
      value: String(summary.domainCount),
      hint: domains[0]?.domain ?? "No custom domain yet",
    },
    {
      label: "Connection",
      value: summary.connectionLabel,
      hint: summary.hostingActive ? "Hosting active" : "Hosting optional",
      capitalize: true,
    },
  ];

  const quickLinks = [
    { href: companyWebsiteConnectionPath(slug), label: "Connection", icon: Link2 },
    { href: companyWebsiteDomainsPath(slug), label: "Domains", icon: Globe },
    { href: companyWebsiteApiKeysPath(slug), label: "API keys", icon: Key },
    { href: companyWebsiteTrackingPath(slug), label: "Tracking", icon: LineChart },
    ...(hasWebsiteProject
      ? [{ href: companyProjectPath(slug), label: "Website build", icon: Wrench }]
      : []),
    { href: companyHostingPath(slug), label: "Subscription", icon: Server },
  ];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Website
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Overview</h1>
          <p className="mt-2 text-sm text-slate-500">
            Connect an external site, host on FaraiOS, or track a done-for-you build — domains,
            API keys, and analytics live in one hub.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={companyWebsiteCreatePath(slug)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create website
          </Link>
          <Link
            href={companyWebsiteDomainsPath(slug)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Manage domains
          </Link>
        </div>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p
              className={cn(
                "mt-2 text-2xl font-bold text-slate-900",
                card.capitalize && "text-lg capitalize"
              )}
            >
              {card.value}
            </p>
            {card.hint ? (
              <p className="mt-1 truncate text-xs text-slate-400">{card.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      <section className="mb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Choose your path
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          <a
            href={companyWebsiteConnectionPath(slug)}
            className="group flex items-start gap-4 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/70 to-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Custom site</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Connect your existing website with booking widget and tracking.
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-violet-400 transition-transform group-hover:translate-x-0.5" />
          </a>

          <Link
            href={companyWebsiteCreatePath(slug)}
            className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Globe className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Hosted on FaraiOS</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Launch a template-based site managed in your dashboard.
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href={companyWebsiteBuilderPath(slug)}
            className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Hammer className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Website builder</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Generate a landing page, contact form, and booking button from your profile.
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-violet-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <SectionCard
            title="Hosted websites"
            description="FaraiOS-managed sites created from your workspace templates."
          >
            {websites.length ? (
              <div className="-mx-5 -mb-5 overflow-hidden">
                <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.2fr_0.8fr_1fr_auto_auto]">
                  <span>Name</span>
                  <span>Industry</span>
                  <span>Status</span>
                  <span className="text-right">Edit</span>
                  <span className="text-right">Preview</span>
                </div>
                {websites.map((website) => (
                  <div
                    key={website.id}
                    className="border-b border-slate-100 px-5 py-3 text-sm last:border-b-0 md:grid md:grid-cols-[1.2fr_0.8fr_1fr_auto_auto] md:items-center md:gap-3"
                  >
                    <span className="font-medium text-slate-900">{website.name}</span>
                    <span className="text-slate-600">{website.industry}</span>
                    <span className="capitalize text-slate-600">{website.status}</span>
                    <span className="mt-2 text-right md:mt-0">
                      <Link
                        href={companyWebsiteEditPath(slug, website.id)}
                        className="font-medium text-violet-700 hover:text-violet-900"
                      >
                        Edit
                      </Link>
                    </span>
                    <span className="mt-2 flex justify-end md:mt-0">
                      <PreviewWebsiteButton websiteId={website.id} domain={website.domain} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                <p className="text-sm text-slate-600">No hosted websites yet.</p>
                <Link
                  href={companyWebsiteCreatePath(slug)}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create your first site
                </Link>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="External website"
            description="Connect a custom site with booking widget, tracking, and API integration."
          >
            <p className="text-sm text-slate-600">
              {connectedWebsite?.production_url
                ? `Connected to ${connectedWebsite.production_url}`
                : "No external website connected yet."}
            </p>
            <Link
              href={companyWebsiteConnectionPath(slug)}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              Manage connection
              <ArrowRight className="h-4 w-4" />
            </Link>
          </SectionCard>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Connection status</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Website</dt>
                <dd>
                  {properties[0] ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                        connectionStatusColor(properties[0].status)
                      )}
                    >
                      {connectionStatusLabel(properties[0].status)}
                    </span>
                  ) : (
                    <span className="text-slate-700">Not connected</span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Domain</dt>
                <dd className="capitalize text-slate-900">
                  {domains[0]?.verification_status ?? hosting?.domain_status ?? "none"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">SSL</dt>
                <dd className="capitalize text-slate-900">
                  {domains[0]?.ssl_status ?? hosting?.ssl_status ?? "not started"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Booking</dt>
                <dd className="text-slate-900">
                  {connectedWebsite?.booking_enabled !== false ? "On" : "Off"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Tracking</dt>
                <dd className="text-slate-900">
                  {connectedWebsite?.tracking_enabled !== false ? "On" : "Off"}
                </dd>
              </div>
            </dl>

            {recentEvents.length > 0 ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recent activity
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                  {recentEvents.map((event) => (
                    <li key={event.id} className="flex justify-between gap-2">
                      <span className="capitalize">{event.event_type.replace(/_/g, " ")}</span>
                      <span className="shrink-0 text-slate-400">
                        {new Date(event.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <WebsiteSetupChecklistPanel checklist={checklist} />

          {!checklist.items.find((item) => item.key === "booking_widget")?.done ? (
            <BookingWidgetInstallSummary
              companySlug={slug}
              businessId={companyId}
              formPublished={checklist.items.find((item) => item.key === "booking_form")?.done}
            />
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Quick links</h3>
            <ul className="mt-3 space-y-1">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-violet-800"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    {label}
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
