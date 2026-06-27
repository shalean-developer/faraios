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
  Rocket,
  Server,
} from "lucide-react";

import { PreviewWebsiteButton } from "@/components/websites/preview-website-button";
import { BookingWidgetInstallSummary } from "@/components/company/booking-widget-install-summary";
import { WebsiteSetupChecklistPanel } from "@/components/websites/website-setup-checklist";
import { websiteOverviewHubItems, type WebsiteSubNavKey } from "@/lib/constants/company-nav";
import {
  companyWebsiteBuilderPath,
  companyWebsiteConnectionPath,
  companyWebsiteCreatePath,
  companyWebsiteDomainsPath,
  companyWebsiteEditPath,
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

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
const risePrimaryButtonClassName =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#5a8dee] px-3 text-sm font-medium text-white transition hover:bg-[#4a7de0]";

const HUB_LINK_ICONS: Record<
  WebsiteSubNavKey,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  overview: Globe,
  builder: Hammer,
  "builder-pages": Globe,
  "builder-page-builder": Hammer,
  "builder-templates": Globe,
  "builder-components": Globe,
  "builder-theme": Globe,
  "builder-media": Globe,
  "builder-navigation": Globe,
  "builder-service-pages": Globe,
  "builder-contact": Globe,
  "builder-booking": Globe,
  "builder-seo": Globe,
  "builder-blog": Globe,
  "builder-analytics": LineChart,
  "builder-settings": Globe,
  "builder-publish": Globe,
  "builder-domains": Globe,
  "builder-enquiries": Globe,
  connection: Link2,
  domains: Globe,
  "api-keys": Key,
  tracking: LineChart,
  hosting: Rocket,
  billing: Server,
  project: Hammer,
};

type TrackingEvent = {
  id: string;
  event_type: string;
  source_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  created_at: string;
};

function WidgetHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <h2 className="text-sm font-medium text-slate-700">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  capitalize,
}: {
  label: string;
  value: string;
  hint?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-[10.5rem] flex-1 rounded-xl border border-slate-200 bg-white p-4 sm:min-w-[11rem] lg:min-w-0">
      <p className="text-xs font-semibold leading-tight text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-3 truncate text-2xl font-bold tracking-tight text-slate-900",
          capitalize && "text-lg capitalize"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 truncate text-xs font-medium text-slate-400">{hint}</p> : null}
    </div>
  );
}

function HubLinkTile({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-[#eef2ff] group-hover:text-[#4a6fd8]">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">{label}</p>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">{description}</p>
        ) : null}
      </div>
      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-[#4a6fd8]" />
    </Link>
  );
}

function PathCard({
  href,
  icon: Icon,
  title,
  description,
  featured,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md",
        featured ? "border-[#5a8dee]/40 ring-1 ring-[#5a8dee]/10" : "border-slate-200"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          featured ? "bg-[#eef2ff] text-[#4a6fd8]" : "bg-slate-100 text-slate-600"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-medium leading-snug text-slate-800">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-slate-500">{description}</p>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#4a6fd8]" />
    </Link>
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

  const hubLinks = websiteOverviewHubItems(slug, { hasWebsiteProject });

  return (
    <div className="bg-[#f0f2f5] px-4 py-4 sm:px-5 sm:py-5">
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-medium text-slate-800">Websites</h1>
            <p className="mt-1 text-sm text-slate-500">
              Connect an external site, host on FaraiOS, or track a done-for-you build — domains,
              API keys, and analytics live in one hub.
            </p>
          </div>
          <div className="flex shrink-0 flex-row flex-nowrap items-center gap-2">
            <Link href={companyWebsiteDomainsPath(slug)} className={riseOutlineButtonClassName}>
              Manage domains
            </Link>
            <Link href={companyWebsiteCreatePath(slug)} className={risePrimaryButtonClassName}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Create website
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-nowrap gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {statCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <PathCard
          href={companyWebsiteConnectionPath(slug)}
          icon={Link2}
          title="Custom site"
          description="Connect your existing website with booking widget and tracking."
          featured
        />
        <PathCard
          href={companyWebsiteCreatePath(slug)}
          icon={Globe}
          title="Hosted on FaraiOS"
          description="Launch a template-based site managed in your dashboard."
        />
        <PathCard
          href={companyWebsiteBuilderPath(slug)}
          icon={Hammer}
          title="Website builder"
          description="Generate a landing page, contact form, and booking button from your profile."
        />
      </div>

      <section className={cn("mt-4", riseCardClassName)}>
        <WidgetHeader
          title="Website hub"
          description="Connection, domains, API keys, tracking, deployments, and hosting."
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {hubLinks.map((item) => {
            const Icon = HUB_LINK_ICONS[item.key] ?? Globe;
            return (
              <HubLinkTile
                key={item.key}
                href={item.href}
                icon={Icon}
                label={item.label}
                description={item.description}
              />
            );
          })}
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-stretch">
        <div className="flex h-full flex-col gap-4">
          <section className={riseCardClassName}>
            <WidgetHeader
              title="Hosted websites"
              description="FaraiOS-managed sites created from your workspace templates."
            />
            {websites.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                      <th className="px-4 py-3 sm:px-5">Name</th>
                      <th className="px-4 py-3">Industry</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Edit</th>
                      <th className="px-4 py-3 text-right sm:pr-5">Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {websites.map((website) => (
                      <tr key={website.id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-800 sm:px-5">
                          {website.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{website.industry}</td>
                        <td className="px-4 py-3 capitalize text-slate-600">{website.status}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={companyWebsiteEditPath(slug, website.id)}
                            className="font-medium text-[#4a6fd8] hover:underline"
                          >
                            Edit
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right sm:pr-5">
                          <PreviewWebsiteButton websiteId={website.id} domain={website.domain} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-10 text-center sm:px-5">
                <p className="text-sm text-slate-500">No hosted websites yet.</p>
                <Link href={companyWebsiteCreatePath(slug)} className={cn(risePrimaryButtonClassName, "mt-4")}>
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Create your first site
                </Link>
              </div>
            )}
          </section>

          <section className={cn(riseCardClassName, "flex flex-1 flex-col")}>
            <WidgetHeader
              title="External website"
              description="Connect a custom site with booking widget, tracking, and API integration."
            />
            <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
              <p className="text-sm text-slate-600">
                {connectedWebsite?.production_url
                  ? `Connected to ${connectedWebsite.production_url}`
                  : "No external website connected yet."}
              </p>
              <Link
                href={companyWebsiteConnectionPath(slug)}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#4a6fd8] hover:underline"
              >
                Manage connection
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </div>
          </section>
        </div>

        <aside className="flex min-h-0 flex-col xl:h-full">
          <section className={cn(riseCardClassName, "flex h-full min-h-0 flex-1 flex-col")}>
            <WidgetHeader title="Connection status" />
            <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
              <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Website</dt>
                <dd>
                  {properties[0] ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset",
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
              <div className="mt-auto border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-500">Recent activity</p>
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
          </section>
        </aside>
      </div>

      <WebsiteSetupChecklistPanel checklist={checklist} layout="horizontal" className="mt-4" />

      {!checklist.items.find((item) => item.key === "booking_widget")?.done ? (
        <BookingWidgetInstallSummary
          companySlug={slug}
          businessId={companyId}
          formPublished={checklist.items.find((item) => item.key === "booking_form")?.done}
          className="mt-4"
        />
      ) : null}
    </div>
  );
}
