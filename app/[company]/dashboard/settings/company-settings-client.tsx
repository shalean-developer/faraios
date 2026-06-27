"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { ArrowRight, Calendar, CreditCard, Search, Settings, Users } from "lucide-react";

import { updateCompanySettings } from "@/app/actions/company";
import {
  parseNotificationPreferences,
  type CompanyNotificationPreferences,
} from "@/lib/services/company-notification-preferences";
import {
  companyBookingFormPath,
  companyDashboardPath,
  companyPaymentSettingsPath,
  companyTeamPath,
  companyWebsiteConnectionPath,
} from "@/lib/paths/company";
import {
  riseCardClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import { IndustrySettingsPanel } from "@/components/company/industry-settings-panel";
import type { CompanyWithIndustry, Industry } from "@/types/database";

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
  industries,
}: {
  slug: string;
  company: CompanyWithIndustry;
  industries: Industry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
  const [brandLogoUrl, setBrandLogoUrl] = useState(company.brand_logo_url ?? "");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(
    company.brand_primary_color ?? "#6366f1"
  );
  const [brandAccentColor, setBrandAccentColor] = useState(
    company.brand_accent_color ?? "#4f46e5"
  );
  const [notificationPreferences, setNotificationPreferences] =
    useState<CompanyNotificationPreferences>(() =>
      parseNotificationPreferences(company.notification_preferences)
    );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const completeness = profileCompleteness(company);
  const seoPath = `/${encodeURIComponent(slug)}/dashboard/seo`;

  const statCards = [
    { label: "Profile complete", value: `${completeness}%` },
    { label: "Industry", value: company.industries?.name ?? "—" },
    { label: "Plan", value: company.plan ?? "Standard" },
    { label: "Location", value: company.contact_location?.trim() || "Not set" },
  ];

  const quickLinks: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] =
    [
      { href: companyTeamPath(slug), label: "Team members", icon: Users },
      { href: companyWebsiteConnectionPath(slug), label: "Website connection", icon: Settings },
      { href: companyPaymentSettingsPath(slug), label: "Payment settings", icon: CreditCard },
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
        brandLogoUrl,
        brandPrimaryColor,
        brandAccentColor,
        notificationPreferences,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Business settings saved. SEO profile synced.");
      router.refresh();
    });
  };

  return (
    <div className={risePageClassName}>
      <div className={cn(riseCardClassName, "mb-4")}>
        <div className="border-b border-slate-100 px-4 py-4">
          <Link
            href={companyDashboardPath(slug)}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← Overview
          </Link>
          <h1 className="mt-2 text-lg font-medium text-slate-800">Business profile</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Company profile and contact details. Profile changes sync to your SEO dashboard
            automatically. Website, payment, and team settings live in their dedicated sections.
          </p>
        </div>
        <div className="grid gap-3 bg-slate-50/60 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-0.5 font-semibold text-slate-800">{card.value}</p>
            </div>
          ))}
        </div>
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
          <IndustrySettingsPanel slug={slug} company={company} industries={industries} />

        <form
          onSubmit={onSaveBusiness}
          className={cn(riseCardClassName, "space-y-4 p-6")}
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
          <button type="submit" className={risePrimaryButtonClassName} disabled={pending}>
            {pending ? "Saving..." : "Save business settings"}
          </button>
        </form>

        <form
          onSubmit={onSaveBusiness}
          className={cn(riseCardClassName, "mt-6 space-y-4 p-6")}
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
            <p className="mt-1 text-sm text-slate-500">
              Logo and colours used on your customer-facing website and communications.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Logo URL" className="sm:col-span-2">
              <input
                value={brandLogoUrl}
                onChange={(e) => setBrandLogoUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://yourbusiness.com/logo.png"
              />
            </Field>
            <Field label="Primary colour">
              <input
                type="color"
                value={brandPrimaryColor}
                onChange={(e) => setBrandPrimaryColor(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-1 py-1"
              />
            </Field>
            <Field label="Accent colour">
              <input
                type="color"
                value={brandAccentColor}
                onChange={(e) => setBrandAccentColor(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-1 py-1"
              />
            </Field>
          </div>
          <button type="submit" className={risePrimaryButtonClassName} disabled={pending}>
            {pending ? "Saving..." : "Save branding"}
          </button>
        </form>

        <form
          onSubmit={onSaveBusiness}
          className={cn(riseCardClassName, "mt-6 space-y-4 p-6")}
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Email notifications</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose which email alerts your workspace receives.
            </p>
          </div>
          <div className="space-y-3">
            {(
              [
                ["emailBookingAlerts", "Booking alerts", "New bookings and status changes"],
                ["emailInvoiceAlerts", "Invoice & payment alerts", "Invoices, payments, and overdue reminders"],
                ["emailLeadAlerts", "Lead alerts", "New inbound leads from your website"],
                ["emailMarketingDigest", "Marketing digest", "Periodic growth and campaign summaries"],
              ] as const
            ).map(([key, label, hint]) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={notificationPreferences[key]}
                  onChange={(e) =>
                    setNotificationPreferences((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{label}</span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          <button type="submit" className={risePrimaryButtonClassName} disabled={pending}>
            {pending ? "Saving..." : "Save notification preferences"}
          </button>
        </form>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className={cn(riseCardClassName, "p-5")}>
            <p className="text-sm font-medium text-slate-700">Related settings</p>
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
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
