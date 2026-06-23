"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  Calendar,
  Globe,
  Search,
  Settings,
  Users,
} from "lucide-react";

import {
  connectExternalWebsite,
  updateCompanySettings,
} from "@/app/actions/company";
import { Button } from "@/components/ui/button";
import {
  companyBookingFormPath,
  companyDashboardPath,
  companyTeamPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry, ConnectedWebsite } from "@/types/database";

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

function profileCompleteness(company: CompanyWithIndustry): number {
  const fields = [
    company.name,
    company.primary_contact_name,
    company.primary_contact_email,
    company.contact_phone,
    company.contact_location,
    company.service_areas,
    company.business_description,
  ];
  const filled = fields.filter((v) => v && String(v).trim()).length;
  return Math.round((filled / fields.length) * 100);
}

export function CompanySettingsClient({
  slug,
  company,
  connectedWebsite,
}: {
  slug: string;
  company: CompanyWithIndustry;
  connectedWebsite: ConnectedWebsite | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [connectPending, startConnectTransition] = useTransition();

  const [name, setName] = useState(company.name);
  const [primaryContactName, setPrimaryContactName] = useState(
    company.primary_contact_name ?? ""
  );
  const [primaryContactEmail, setPrimaryContactEmail] = useState(
    company.primary_contact_email ?? ""
  );
  const [contactPhone, setContactPhone] = useState(company.contact_phone ?? "");
  const [contactLocation, setContactLocation] = useState(
    company.contact_location ?? ""
  );
  const [serviceAreas, setServiceAreas] = useState(company.service_areas ?? "");
  const [businessDescription, setBusinessDescription] = useState(
    company.business_description ?? ""
  );
  const [productionUrl, setProductionUrl] = useState(
    connectedWebsite?.production_url ?? ""
  );
  const [apiKey, setApiKey] = useState(connectedWebsite?.api_key ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(company.name);
    setPrimaryContactName(company.primary_contact_name ?? "");
    setPrimaryContactEmail(company.primary_contact_email ?? "");
    setContactPhone(company.contact_phone ?? "");
    setContactLocation(company.contact_location ?? "");
    setServiceAreas(company.service_areas ?? "");
    setBusinessDescription(company.business_description ?? "");
  }, [company]);

  useEffect(() => {
    setProductionUrl(connectedWebsite?.production_url ?? "");
    setApiKey(connectedWebsite?.api_key ?? "");
  }, [connectedWebsite]);

  const completeness = profileCompleteness(company);
  const hasWebsite = Boolean(connectedWebsite?.production_url);
  const seoPath = `/${encodeURIComponent(slug)}/dashboard/seo`;

  const statCards = [
    {
      label: "Profile complete",
      value: `${completeness}%`,
      hint: "7 profile fields",
      highlight: completeness < 100,
    },
    {
      label: "Connected site",
      value: hasWebsite ? "Linked" : "Not linked",
      hint: hasWebsite ? connectedWebsite?.production_url ?? "" : "Connect external site",
    },
    {
      label: "Industry",
      value: company.industries?.name ?? "—",
      hint: "Used across growth tools",
    },
    {
      label: "API key",
      value: apiKey ? "Active" : "Pending",
      hint: apiKey ? "For external booking embed" : "Generated on connect",
    },
  ];

  const quickLinks: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] =
    [
      { href: companyTeamPath(slug), label: "Team access", icon: Users },
      { href: companyWebsitesPath(slug), label: "Websites & domains", icon: Globe },
      { href: seoPath, label: "SEO settings", icon: Search },
      { href: companyBookingFormPath(slug), label: "Booking form", icon: Calendar },
    ];

  const onSaveBusiness = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateCompanySettings({
        companyId: company.id,
        companySlug: slug,
        name,
        primaryContactName,
        primaryContactEmail,
        contactPhone,
        contactLocation,
        serviceAreas,
        businessDescription,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Business settings saved. SEO profile synced.");
      router.refresh();
    });
  };

  const onConnectWebsite = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startConnectTransition(async () => {
      const result = await connectExternalWebsite({
        companyId: company.id,
        companySlug: slug,
        productionUrl,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Connected website saved.");
      router.refresh();
    });
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <Link
          href={companyDashboardPath(slug)}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Dashboard
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-violet-600">
          Settings
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Business settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Company profile, contact details, and connected website. Profile changes sync to your
          SEO dashboard automatically.
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          <form
            onSubmit={onSaveBusiness}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Company profile</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Public-facing details used in campaigns, SEO, and booking flows.
                </p>
              </div>
              <Settings className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Business name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  required
                />
              </Field>
              <Field label="Primary contact name">
                <input
                  value={primaryContactName}
                  onChange={(e) => setPrimaryContactName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Primary contact email">
                <input
                  value={primaryContactEmail}
                  onChange={(e) => setPrimaryContactEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Location">
                <input
                  value={contactLocation}
                  onChange={(e) => setContactLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Service areas">
                <input
                  value={serviceAreas}
                  onChange={(e) => setServiceAreas(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="e.g. Cape Town, Stellenbosch"
                />
              </Field>
              <Field label="Business description" className="sm:col-span-2">
                <textarea
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Saving..." : "Save business settings"}
            </Button>
          </form>

          <form
            onSubmit={onConnectWebsite}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Connected website</h2>
              <p className="mt-1 text-sm text-slate-500">
                Link an external site you already host. Use the API key when integrating booking
                submissions from your custom site. For FaraiOS-hosted sites, use{" "}
                <Link
                  href={companyWebsitesPath(slug)}
                  className="font-medium text-violet-700 hover:text-violet-900"
                >
                  Websites
                </Link>
                .
              </p>
            </div>
            <Field label="Production URL">
              <input
                value={productionUrl}
                onChange={(e) => setProductionUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://yourbusiness.com"
              />
            </Field>
            {apiKey ? (
              <Field label="API key">
                <input
                  value={apiKey}
                  readOnly
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600"
                />
              </Field>
            ) : null}
            <Button type="submit" className="rounded-xl" disabled={connectPending}>
              {connectPending ? "Saving..." : hasWebsite ? "Update connection" : "Connect website"}
            </Button>
          </form>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick links
            </p>
            <ul className="mt-3 space-y-1">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
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

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
