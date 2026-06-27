"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import {
  publishBookingForm,
  resetBookingFormToIndustryPreset,
  saveBookingAvailability,
  saveBookingFormDraft,
} from "@/app/actions/booking-form";
import {
  saveBookingFormExtrasAction,
  saveBookingFormServiceAreasAction,
  saveBookingFormSettingsAction,
  saveBookingPricingRuleAction,
  unpublishBookingForm,
} from "@/app/actions/booking-form-builder";
import { DynamicPublicBookingForm } from "@/components/booking/dynamic-public-booking-form";
import { SteppedPublicBookingForm } from "@/components/booking/stepped-public-booking-form";
import { BookingWidgetInstallSummary } from "@/components/company/booking-widget-install-summary";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultBookingHours } from "@/lib/bookings/availability";
import { defaultPricingRule } from "@/lib/bookings/pricing-calculator";
import {
  companyBookingsPath,
  companyBookingPath,
  companyServicesPath,
  publicBookSlugPath,
} from "@/lib/paths/company";
import { formatRevenue } from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type {
  BookingForm,
  BookingFormExtra,
  BookingFormField,
  BookingFormPricingRule,
  BookingFormServiceArea,
  BookingFormSettings,
  BookingHours,
} from "@/types/booking-form";
import type { Booking, CompanyService, CompanyWithIndustry } from "@/types/database";

const DAY_LABELS: { key: keyof BookingHours; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

function centsFromInput(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function CompanyBookingFormClient({
  slug,
  company,
  industrySlug,
  initialForm,
  initialBookingHours,
  initialBlockedDates,
  services,
  initialPricingRule,
  initialExtras,
  initialServiceAreas,
  recentBookings,
}: {
  slug: string;
  company: CompanyWithIndustry;
  industrySlug: string | null;
  initialForm: BookingForm;
  initialBookingHours: BookingHours;
  initialBlockedDates: string[];
  services: CompanyService[];
  initialPricingRule: BookingFormPricingRule | null;
  initialExtras: BookingFormExtra[];
  initialServiceAreas: BookingFormServiceArea[];
  recentBookings: Booking[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [fields, setFields] = useState<BookingFormField[]>(initialForm.fields);
  const [settings, setSettings] = useState<BookingFormSettings>(initialForm.settings ?? {});
  const [pricingRule, setPricingRule] = useState<BookingFormPricingRule | null>(initialPricingRule);
  const [extras, setExtras] = useState<BookingFormExtra[]>(initialExtras);
  const [serviceAreas, setServiceAreas] = useState<BookingFormServiceArea[]>(initialServiceAreas);
  const [bookingHours, setBookingHours] = useState<BookingHours>(
    initialBookingHours ?? defaultBookingHours()
  );
  const [blockedDatesText, setBlockedDatesText] = useState(initialBlockedDates.join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicLink =
    typeof window !== "undefined"
      ? `${window.location.origin}${publicBookSlugPath(slug)}`
      : publicBookSlugPath(slug);

  const previewServices = useMemo(
    () =>
      services
        .filter((s) => s.active)
        .map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          base_price_cents: s.base_price_cents,
          addons: s.addons,
        })),
    [services]
  );

  const branding = settings.branding ?? {};
  const logoUrl = branding.useCompanyBranding !== false ? company.brand_logo_url : branding.logoUrl;
  const brandColor =
    branding.useCompanyBranding !== false
      ? company.brand_primary_color ?? "#6d28d9"
      : branding.brandColor ?? "#6d28d9";

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await fn();
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setSuccess("Saved.");
    router.refresh();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  };

  const updateField = (key: string, patch: Partial<BookingFormField>) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  };

  const ensurePricingRule = (): BookingFormPricingRule => {
    if (pricingRule) return pricingRule;
    const defaults = defaultPricingRule(company.id);
    return { ...defaults, id: "" };
  };

  const riseButtonClassName = cn(risePrimaryButtonClassName, "rounded-md");

  return (
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-800">Booking form</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Configure services, pricing, branding, and publish a public booking link for customers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className={riseOutlineButtonClassName} variant="outline" disabled={pending} onClick={() => run(() => saveBookingFormDraft({ companyId: company.id, companySlug: slug, fields, name: initialForm.name }))}>
              Save draft
            </Button>
            <Button className={riseButtonClassName} disabled={pending} onClick={() => run(() => publishBookingForm({ companyId: company.id, companySlug: slug, fields, name: initialForm.name }))}>
              Publish
            </Button>
          </div>
        </div>

      {error ? <p className="mx-4 mb-4 text-sm text-red-600 sm:mx-5">{error}</p> : null}
      {success ? <p className="mx-4 mb-4 text-sm text-emerald-700 sm:mx-5">{success}</p> : null}

      <Tabs value={tab} onValueChange={setTab} defaultValue="overview" className="space-y-6 px-4 py-4 sm:px-5">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="extras">Extras</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="areas">Service Areas</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Status", value: initialForm.status },
              { label: "Version", value: String(initialForm.version) },
              { label: "Active services", value: String(previewServices.length) },
              { label: "Recent bookings", value: String(recentBookings.length) },
            ].map((card) => (
              <div key={card.label} className={cn(riseCardClassName, "p-4")}>
                <p className="text-xs font-semibold uppercase text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold capitalize text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          {settings.templates && settings.templates.length > 0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Service templates</h2>
              <p className="mt-1 text-sm text-slate-500">Enable templates your customers can book.</p>
              <ul className="mt-4 space-y-2">
                {settings.templates.map((template) => (
                  <li key={template.key} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{template.name}</p>
                      {template.description ? (
                        <p className="text-xs text-slate-500">{template.description}</p>
                      ) : null}
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={template.enabled}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            templates: s.templates?.map((t) =>
                              t.key === template.key ? { ...t, enabled: e.target.checked } : t
                            ),
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-end">
                <Button
                  className={riseButtonClassName}
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      saveBookingFormSettingsAction({
                        companyId: company.id,
                        companySlug: slug,
                        settings,
                      })
                    )
                  }
                >
                  Save templates
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Recent bookings</h2>
            {recentBookings.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No bookings yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {recentBookings.slice(0, 5).map((booking) => (
                  <li key={booking.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{booking.customer_name}</p>
                      <p className="text-xs text-slate-500">{booking.service}</p>
                    </div>
                    <Link href={companyBookingPath(slug, booking.id)} className="text-[#4a6fd8] hover:underline">
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href={companyBookingsPath(slug)} className="mt-3 inline-block text-sm font-medium text-[#4a6fd8]">
              All bookings →
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">
              Services are managed in your service catalog. Active services appear on the public booking form.
            </p>
            <ul className="mt-4 space-y-2">
              {services.map((service) => (
                <li key={service.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                  <span className={service.active ? "text-slate-900" : "text-slate-400"}>
                    {service.name} — {formatRevenue(service.base_price_cents)}
                  </span>
                  <span className={cn("text-xs", service.active ? "text-emerald-600" : "text-slate-400")}>
                    {service.active ? "Active" : "Inactive"}
                  </span>
                </li>
              ))}
            </ul>
            <Link href={companyServicesPath(slug)} className="mt-4 inline-block text-sm font-medium text-[#4a6fd8]">
              Manage services →
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Form fields</h2>
            <ul className="mt-3 space-y-2">
              {[...fields].sort((a, b) => a.sortOrder - b.sortOrder).map((field) => (
                <li key={field.key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <input
                    value={field.label}
                    onChange={(e) => updateField(field.key, { label: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  />
                  <p className="mt-1 font-mono text-[10px] text-slate-400">
                    {field.key} · {field.type}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className={riseOutlineButtonClassName}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    resetBookingFormToIndustryPreset({
                      companyId: company.id,
                      companySlug: slug,
                      industrySlug,
                    })
                  )
                }
              >
                Reset to industry preset
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Dynamic pricing</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["base_price_cents", "Base price (R)"],
                  ["price_per_bedroom_cents", "Per bedroom (R)"],
                  ["price_per_bathroom_cents", "Per bathroom (R)"],
                  ["service_fee_cents", "Service fee (R)"],
                  ["minimum_price_cents", "Minimum price (R)"],
                  ["maximum_price_cents", "Maximum price (R)"],
                  ["vat_rate_percent", "VAT %"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm font-medium text-slate-700">
                  {label}
                  <input
                    type="number"
                    step={key === "vat_rate_percent" ? "0.01" : "0.01"}
                    value={
                      key === "vat_rate_percent"
                        ? String(ensurePricingRule()[key] ?? 0)
                        : centsToInput(ensurePricingRule()[key] as number)
                    }
                    onChange={(e) => {
                      const rule = ensurePricingRule();
                      const value =
                        key === "vat_rate_percent"
                          ? parseFloat(e.target.value) || 0
                          : centsFromInput(e.target.value);
                      setPricingRule({
                        ...rule,
                        [key]: key === "maximum_price_cents" && value === 0 ? null : value,
                      } as BookingFormPricingRule);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ensurePricingRule().custom_quote_enabled}
                onChange={(e) =>
                  setPricingRule({ ...ensurePricingRule(), custom_quote_enabled: e.target.checked })
                }
              />
              Enable custom quote option
            </label>
            <div className="mt-4 flex justify-end">
              <Button
                className={riseButtonClassName}
                disabled={pending}
                onClick={() => {
                  const rule = ensurePricingRule();
                  return run(() =>
                    saveBookingPricingRuleAction({
                      companyId: company.id,
                      companySlug: slug,
                      rule,
                    })
                  );
                }}
              >
                Save pricing
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="extras">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Booking extras</h2>
              <Button
                variant="outline"
                size="sm"
                className={riseOutlineButtonClassName}
                onClick={() =>
                  setExtras((prev) => [
                    ...prev,
                    {
                      id: `new_${crypto.randomUUID()}`,
                      company_id: company.id,
                      name: "New extra",
                      description: null,
                      price_cents: 0,
                      active: true,
                      sort_order: prev.length,
                    },
                  ])
                }
              >
                Add extra
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {extras.map((extra, index) => (
                <li
                  key={extra.id || `extra-${index}`}
                  className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-3"
                >
                  <input
                    value={extra.name}
                    onChange={(e) =>
                      setExtras((prev) =>
                        prev.map((x, i) => (i === index ? { ...x, name: e.target.value } : x))
                      )
                    }
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    placeholder="Name"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={centsToInput(extra.price_cents)}
                    onChange={(e) =>
                      setExtras((prev) =>
                        prev.map((x, i) =>
                          i === index ? { ...x, price_cents: centsFromInput(e.target.value) } : x
                        )
                      )
                    }
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    placeholder="Price (R)"
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={extra.active}
                      onChange={(e) =>
                        setExtras((prev) =>
                          prev.map((x, i) => (i === index ? { ...x, active: e.target.checked } : x))
                        )
                      }
                    />
                    Active
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <Button
                className={riseButtonClassName}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    saveBookingFormExtrasAction({ companyId: company.id, companySlug: slug, extras })
                  )
                }
              >
                Save extras
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="availability">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {DAY_LABELS.map(({ key, label }) => {
                const day = bookingHours[key] ?? { open: "09:00", close: "17:00" };
                return (
                  <div key={key} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{label}</p>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(day.closed)}
                          onChange={(e) =>
                            setBookingHours((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], closed: e.target.checked },
                            }))
                          }
                        />
                        Closed
                      </label>
                    </div>
                    {!day.closed ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="time"
                          value={day.open}
                          onChange={(e) =>
                            setBookingHours((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], open: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        />
                        <input
                          type="time"
                          value={day.close}
                          onChange={(e) =>
                            setBookingHours((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], close: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <label className="mt-4 block text-sm">
              Blocked dates (YYYY-MM-DD, one per line)
              <textarea
                value={blockedDatesText}
                onChange={(e) => setBlockedDatesText(e.target.value)}
                className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="mt-4 flex justify-end">
              <Button
                className={riseButtonClassName}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    saveBookingAvailability({
                      companyId: company.id,
                      companySlug: slug,
                      bookingHours,
                      blockedDates: blockedDatesText
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean),
                    })
                  )
                }
              >
                Save availability
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="areas">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Service areas</h2>
              <Button
                variant="outline"
                size="sm"
                className={riseOutlineButtonClassName}
                onClick={() =>
                  setServiceAreas((prev) => [
                    ...prev,
                    {
                      id: `new_${crypto.randomUUID()}`,
                      company_id: company.id,
                      name: "New area",
                      active: true,
                      sort_order: prev.length,
                    },
                  ])
                }
              >
                Add area
              </Button>
            </div>
            <ul className="mt-4 space-y-2">
              {serviceAreas.map((area, index) => (
                <li key={area.id || `area-${index}`} className="flex items-center gap-2">
                  <input
                    value={area.name}
                    onChange={(e) =>
                      setServiceAreas((prev) =>
                        prev.map((x, i) => (i === index ? { ...x, name: e.target.value } : x))
                      )
                    }
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={area.active}
                      onChange={(e) =>
                        setServiceAreas((prev) =>
                          prev.map((x, i) => (i === index ? { ...x, active: e.target.checked } : x))
                        )
                      }
                    />
                    Active
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <Button
                className={riseButtonClassName}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    saveBookingFormServiceAreasAction({
                      companyId: company.id,
                      companySlug: slug,
                      areas: serviceAreas,
                    })
                  )
                }
              >
                Save areas
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branding">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={branding.useCompanyBranding !== false}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    branding: { ...s.branding, useCompanyBranding: e.target.checked },
                  }))
                }
              />
              Use company branding from settings
            </label>
            <label className="block text-sm font-medium">
              Business name override
              <input
                value={branding.businessName ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    branding: { ...s.branding, businessName: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder={company.name}
              />
            </label>
            <label className="block text-sm font-medium">
              Brand color
              <input
                type="color"
                value={brandColor ?? "#6d28d9"}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    branding: { ...s.branding, brandColor: e.target.value, useCompanyBranding: false },
                  }))
                }
                className="mt-1 h-10 w-full rounded-xl border border-slate-200"
              />
            </label>
            <label className="block text-sm font-medium">
              Confirmation message
              <textarea
                value={settings.confirmationMessage ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, confirmationMessage: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(settings.paymentRequired)}
                onChange={(e) => setSettings((s) => ({ ...s, paymentRequired: e.target.checked }))}
              />
              Payment required (collected after confirmation)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.multiStep !== false}
                onChange={(e) => setSettings((s) => ({ ...s, multiStep: e.target.checked }))}
              />
              Multi-step booking flow
            </label>
            <div className="flex justify-end">
              <Button
                className={riseButtonClassName}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    saveBookingFormSettingsAction({
                      companyId: company.id,
                      companySlug: slug,
                      settings,
                    })
                  )
                }
              >
                Save branding
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {settings.multiStep !== false ? (
              <SteppedPublicBookingForm
                businessName={branding.businessName ?? company.name}
                logoUrl={logoUrl}
                brandColor={brandColor}
                fields={fields}
                services={previewServices}
                extras={extras}
                pricingRule={pricingRule}
                settings={settings}
                preview
                embedded
                onSubmit={async () => ({ ok: false, error: "Preview only." })}
              />
            ) : (
              <DynamicPublicBookingForm
                businessName={company.name}
                fields={fields}
                services={previewServices}
                preview
                embedded
                onSubmit={async () => ({ ok: false, error: "Preview only." })}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="publish">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Public booking link</p>
              <p className="mt-1 text-sm text-slate-500">Share this link with customers.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {publicLink}
                </code>
                <Button variant="outline" className={riseOutlineButtonClassName} onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <a
                  href={publicBookSlugPath(slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#4a6fd8]"
                >
                  Open <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Legacy UUID link still works: /book/{company.id}
              </p>
            </div>

            <BookingWidgetInstallSummary
              companySlug={slug}
              businessId={company.id}
              formPublished={initialForm.status === "published"}
              showSnippet={initialForm.status === "published"}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                className={riseButtonClassName}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    publishBookingForm({
                      companyId: company.id,
                      companySlug: slug,
                      fields,
                      name: initialForm.name,
                    })
                  )
                }
              >
                Publish form
              </Button>
              {initialForm.status === "published" ? (
                <Button
                  variant="outline"
                  className={riseOutlineButtonClassName}
                  disabled={pending}
                  onClick={() =>
                    run(() => unpublishBookingForm({ companyId: company.id, companySlug: slug }))
                  }
                >
                  Unpublish
                </Button>
              ) : null}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
