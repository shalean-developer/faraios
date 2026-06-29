"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  Database,
  ExternalLink,
  FileText,
  FolderKey,
  Globe,
  LifeBuoy,
  Mail,
  Network,
} from "lucide-react";

import { requestHostingCancellationAction } from "@/app/actions/hosting-automation";
import { HostingStatusBadge } from "@/components/hosting/hosting-shared-ui";
import { Button } from "@/components/ui/button";
import {
  companyHostingDatabasesPath,
  companyHostingDomainsPath,
  companyHostingDnsPath,
  companyHostingFtpPath,
  companyHostingInvoicesPath,
  companyHostingMailboxesPath,
  companyHostingServicesPath,
  companyHostingSupportPath,
} from "@/lib/paths/company";
import type { HostingServiceResourceSummary } from "@/lib/services/hosting-resources";
import type { HostingServiceRow } from "@/types/hosting-automation";

type PanelLink = {
  href: string;
  label: string;
  description: string;
  count: string;
  icon: typeof Globe;
};

export function CompanyHostingServicePanelClient({
  slug,
  companyId,
  service,
  resourceSummary,
}: {
  slug: string;
  companyId: string;
  service: HostingServiceRow;
  resourceSummary: HostingServiceResourceSummary;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = service.hosting_plans;
  const serviceScope = { serviceId: service.id };

  const links: PanelLink[] = [
    {
      href: companyHostingDomainsPath(slug, serviceScope),
      label: "Domains",
      description: "DNS status and linked domains",
      count: String(resourceSummary.domains),
      icon: Globe,
    },
    {
      href: companyHostingDnsPath(slug, serviceScope),
      label: "DNS",
      description: "Add and remove DNS records",
      count: String(resourceSummary.dnsRecords),
      icon: Network,
    },
    {
      href: companyHostingMailboxesPath(slug, serviceScope),
      label: "Mailboxes",
      description: plan
        ? `Create and manage email accounts (${resourceSummary.mailboxes}/${plan.email_account_limit})`
        : "Create and manage email accounts",
      count: String(resourceSummary.mailboxes),
      icon: Mail,
    },
    {
      href: companyHostingFtpPath(slug, serviceScope),
      label: "FTP",
      description: plan
        ? `File upload accounts (${resourceSummary.ftpAccounts}/${plan.ftp_account_limit})`
        : "File upload accounts",
      count: String(resourceSummary.ftpAccounts),
      icon: FolderKey,
    },
    {
      href: companyHostingDatabasesPath(slug, serviceScope),
      label: "Databases",
      description: plan
        ? `MySQL databases (${resourceSummary.databases}/${plan.database_limit})`
        : "MySQL databases",
      count: String(resourceSummary.databases),
      icon: Database,
    },
    {
      href: companyHostingInvoicesPath(slug, serviceScope),
      label: "Invoices",
      description: "Billing history for this service",
      count: "View",
      icon: FileText,
    },
    {
      href: companyHostingSupportPath(slug, serviceScope),
      label: "Support",
      description: "Open a ticket for hosting help",
      count:
        resourceSummary.openTickets > 0
          ? `${resourceSummary.openTickets} open`
          : "Contact",
      icon: LifeBuoy,
    },
  ];

  const onCancel = () => {
    if (
      !window.confirm(
        `Request cancellation for ${service.domain_name}? Your hosting stays active until the billing period ends.`
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await requestHostingCancellationAction({
        companyId,
        companySlug: slug,
        serviceId: service.id,
        domainName: service.domain_name,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not request cancellation.");
        return;
      }
      setMessage(`Cancellation requested for ${service.domain_name}.`);
      router.refresh();
    });
  };

  return (
    <>
      <Link
        href={companyHostingServicesPath(slug)}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="h-4 w-4" />
        All hosting services
      </Link>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {service.domain_name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{plan?.name ?? "Hosting plan"}</p>
            {service.next_due_date && (
              <p className="mt-1 text-xs text-slate-400">
                Renews {new Date(service.next_due_date).toLocaleDateString()}
              </p>
            )}
            {plan?.ssl_included && (
              <p className="mt-2 text-xs font-medium text-emerald-700">SSL included</p>
            )}
          </div>
          <HostingStatusBadge status={service.status} />
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        Manage email, FTP, databases, and support for this hosting account.
      </p>

      {message && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 group-hover:bg-white">
                  {link.count}
                </span>
              </div>
              <h2 className="mt-4 text-sm font-bold text-slate-900">{link.label}</h2>
              <p className="mt-1 text-xs text-slate-500">{link.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-6">
        <Button variant="outline" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? "Requesting..." : "Request cancellation"}
        </Button>
        {service.control_panel_url && (
          <a
            href={service.control_panel_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Advanced settings (Plesk)
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        )}
      </div>
    </>
  );
}
