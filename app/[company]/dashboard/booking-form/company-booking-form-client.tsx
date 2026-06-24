"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import {
  publishBookingForm,
  resetBookingFormToIndustryPreset,
  saveBookingAvailability,
  saveBookingFormDraft,
} from "@/app/actions/booking-form";
import { DynamicPublicBookingForm } from "@/components/booking/dynamic-public-booking-form";
import { Button } from "@/components/ui/button";
import { defaultBookingHours } from "@/lib/bookings/availability";
import { INDUSTRY_PRESET_SLUGS } from "@/lib/bookings/industry-presets";
import {
  companyBookingsPath,
  companyCalendarPath,
  companyServicesPath,
  publicBookPath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { BookingForm, BookingFormField, BookingHours } from "@/types/booking-form";
import type { CompanyService, CompanyWithIndustry } from "@/types/database";

const DAY_LABELS: { key: keyof BookingHours; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

function statusBadgeClass(status: BookingForm["status"]): string {
  return status === "published"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-amber-50 text-amber-700";
}

export function CompanyBookingFormClient({
  slug,
  company,
  industrySlug,
  initialForm,
  initialBookingHours,
  initialBlockedDates,
  services,
}: {
  slug: string;
  company: CompanyWithIndustry;
  industrySlug: string | null;
  initialForm: BookingForm;
  initialBookingHours: BookingHours;
  initialBlockedDates: string[];
  services: CompanyService[];
}) {
  const router = useRouter();
  const [fields, setFields] = useState<BookingFormField[]>(initialForm.fields);
  const [bookingHours, setBookingHours] = useState<BookingHours>(
    initialBookingHours ?? defaultBookingHours()
  );
  const [blockedDatesText, setBlockedDatesText] = useState(
    initialBlockedDates.join("\n")
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.sortOrder - b.sortOrder),
    [fields]
  );

  const systemFields = sortedFields.filter((field) => field.system);
  const customFields = sortedFields.filter((field) => !field.system);

  const previewServices = useMemo(
    () =>
      services
        .filter((service) => service.active)
        .map((service) => ({
          id: service.id,
          name: service.name,
          base_price_cents: service.base_price_cents,
          addons: service.addons,
        })),
    [services]
  );

  const blockedDatesCount = blockedDatesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;

  const addCustomField = () => {
    const key = `custom_${Date.now()}`;
    setFields((prev) => [
      ...prev,
      {
        key,
        type: "text",
        label: "Custom field",
        sortOrder: prev.length,
        section: "Custom",
      },
    ]);
  };

  const updateField = (key: string, patch: Partial<BookingFormField>) => {
    setFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, ...patch } : field))
    );
  };

  const removeField = (key: string) => {
    setFields((prev) => prev.filter((field) => field.system || field.key !== key));
  };

  const onSaveDraft = async () => {
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await saveBookingFormDraft({
      companyId: company.id,
      companySlug: slug,
      fields,
      name: initialForm.name,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("Draft saved.");
    router.refresh();
  };

  const onPublish = async () => {
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await publishBookingForm({
      companyId: company.id,
      companySlug: slug,
      fields,
      name: initialForm.name,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("Booking form published.");
    router.refresh();
  };

  const onResetPreset = async () => {
    if (!window.confirm("Apply latest industry preset? Unsaved customizations will be replaced.")) {
      return;
    }
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await resetBookingFormToIndustryPreset({
      companyId: company.id,
      companySlug: slug,
      industrySlug,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const onSaveAvailability = async () => {
    setPending(true);
    setError(null);
    setSuccess(null);
    const blockedDates = blockedDatesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const result = await saveBookingAvailability({
      companyId: company.id,
      companySlug: slug,
      bookingHours,
      blockedDates,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("Availability settings saved.");
    router.refresh();
  };

  const updateDayHours = (
    day: keyof BookingHours,
    patch: Partial<BookingHours[keyof BookingHours]>
  ) => {
    setBookingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  };

  const statCards = [
    {
      label: "Status",
      value: initialForm.status.replace(/_/g, " "),
      hint: initialForm.status === "published" ? `Version ${initialForm.version}` : "Not public yet",
    },
    {
      label: "Form fields",
      value: String(sortedFields.length),
      hint: `${systemFields.length} system · ${customFields.length} custom`,
    },
    {
      label: "Active services",
      value: String(previewServices.length),
      hint: "Shown in service dropdown",
    },
    {
      label: "Blocked dates",
      value: String(blockedDatesCount),
      hint: "Holidays and closures",
    },
  ];

  const renderFieldEditor = (field: BookingFormField) => (
    <li
      key={field.key}
      className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={field.label}
            onChange={(e) => updateField(field.key, { label: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
          />
          <p className="font-mono text-[11px] text-slate-400">
            {field.key} · {field.type}
            {field.system ? " · system" : ""}
          </p>
        </div>
        {!field.system ? (
          <button
            type="button"
            onClick={() => removeField(field.key)}
            className="shrink-0 text-xs font-medium text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        ) : null}
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={Boolean(field.required)}
          onChange={(e) => updateField(field.key, { required: e.target.checked })}
          className="rounded border-slate-300"
        />
        Required field
      </label>
    </li>
  );

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Booking engine
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Booking form</h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure the public booking form, preview how customers see it, and set weekly
            availability rules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl" disabled={pending} onClick={onSaveDraft}>
            Save draft
          </Button>
          <Button className="rounded-xl" disabled={pending} onClick={onPublish}>
            Publish form
          </Button>
          <Button
            className="rounded-xl"
            variant="outline"
            disabled={pending}
            onClick={onResetPreset}
          >
            Apply latest industry preset
          </Button>
        </div>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold capitalize text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
              statusBadgeClass(initialForm.status)
            )}
          >
            {initialForm.status}
          </span>
          <span className="font-mono text-xs text-slate-500">ID {company.id}</span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <a
            href={publicBookPath(company.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center font-medium text-violet-700 hover:text-violet-900"
          >
            Preview public page
            <ExternalLink className="ml-1.5 h-4 w-4" />
          </a>
          <Link
            href={companyBookingsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Bookings →
          </Link>
          <Link
            href={companyCalendarPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Calendar →
          </Link>
          <Link
            href={companyServicesPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Services →
          </Link>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm font-medium text-red-600">{error}</p> : null}
      {success ? <p className="mb-4 text-sm font-medium text-emerald-700">{success}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Form fields</h2>
            <p className="mt-1 text-sm text-slate-500">
              System fields stay on the form. Add custom questions for your business.
            </p>
          </div>
          <div className="flex-1 space-y-6 px-5 py-4">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                System fields
              </p>
              <ul className="space-y-3">{systemFields.map(renderFieldEditor)}</ul>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Custom fields
                </p>
                <Button
                  type="button"
                  className="rounded-xl"
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                >
                  Add field
                </Button>
              </div>
              {customFields.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  No custom fields yet.
                </p>
              ) : (
                <ul className="space-y-3">{customFields.map(renderFieldEditor)}</ul>
              )}
            </div>
          </div>
          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            Industry presets: {INDUSTRY_PRESET_SLUGS.join(", ")}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-6">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Live preview</h2>
            <p className="mt-1 text-sm text-slate-500">
              Matches the public booking form layout, including services and add-ons.
            </p>
          </div>
          <div className="px-5 py-4">
            <DynamicPublicBookingForm
              businessName={company.name}
              fields={sortedFields}
              services={previewServices}
              preview
              embedded
              mode="public"
              formTitle={`Book ${company.name}`}
              formDescription="Preview of your customer-facing booking form."
              onSubmit={async () => ({ ok: false, error: "Preview only." })}
            />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Booking availability</h2>
          <p className="mt-1 text-sm text-slate-500">
            Weekly hours and blocked dates used when validating public bookings.
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {DAY_LABELS.map(({ key, label, short }) => {
              const day = bookingHours[key] ?? { open: "09:00", close: "17:00" };

              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{label}</p>
                      <p className="text-xs text-slate-400 sm:hidden">{short}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(day.closed)}
                        onChange={(e) => updateDayHours(key, { closed: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      Closed
                    </label>
                  </div>
                  {!day.closed ? (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="time"
                        value={day.open}
                        onChange={(e) => updateDayHours(key, { open: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <span className="shrink-0 text-xs text-slate-400">to</span>
                      <input
                        type="time"
                        value={day.close}
                        onChange={(e) => updateDayHours(key, { close: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">No bookings accepted.</p>
                  )}
                </div>
              );
            })}
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-medium text-slate-900">Blocked dates</span>
            <span className="mt-1 block text-xs text-slate-500">
              One YYYY-MM-DD date per line.
            </span>
            <textarea
              value={blockedDatesText}
              onChange={(e) => setBlockedDatesText(e.target.value)}
              className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
              placeholder={"2026-12-25\n2026-01-01"}
            />
          </label>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4">
          <Button className="rounded-xl" disabled={pending} onClick={onSaveAvailability}>
            Save availability
          </Button>
        </div>
      </section>
    </div>
  );
}
