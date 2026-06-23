"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import {
  connectExternalWebsite,
  updateCompanySettings,
} from "@/app/actions/company";
import { Button } from "@/components/ui/button";
import { companyTeamPath } from "@/lib/paths/company";
import type { CompanyWithIndustry, ConnectedWebsite } from "@/types/database";

export function CompanySettingsClient({
  slug,
  company,
  connectedWebsite,
}: {
  slug: string;
  company: CompanyWithIndustry;
  connectedWebsite: ConnectedWebsite | null;
}) {
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
  const [pending, setPending] = useState(false);
  const [connectPending, setConnectPending] = useState(false);

  const onSaveBusiness = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
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
      setSuccess("Business settings saved.");
    } finally {
      setPending(false);
    }
  };

  const onConnectWebsite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setConnectPending(true);
    try {
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
      window.location.reload();
    } finally {
      setConnectPending(false);
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Settings
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Business settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Company profile, contact details, and connected website.{" "}
          <Link
            href={companyTeamPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Manage team access
          </Link>
          .
        </p>
      </header>

      {error ? (
        <p className="mb-4 text-sm font-medium text-red-600">{error}</p>
      ) : null}
      {success ? (
        <p className="mb-4 text-sm font-medium text-emerald-600">{success}</p>
      ) : null}

      <form
        onSubmit={onSaveBusiness}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">Company profile</h2>
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
        className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Connected website (Option A)
        </h2>
        <p className="text-sm text-slate-500">
          Link an external website you already host. Use the API key when
          integrating booking submissions from your custom site.
        </p>
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
          {connectPending ? "Saving..." : "Connect website"}
        </Button>
      </form>
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
