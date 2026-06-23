"use client";

import { useState } from "react";

import {
  publishBookingForm,
  resetBookingFormToIndustryPreset,
  saveBookingAvailability,
  saveBookingFormDraft,
} from "@/app/actions/booking-form";
import { Button } from "@/components/ui/button";
import { defaultBookingHours } from "@/lib/bookings/availability";
import { INDUSTRY_PRESET_SLUGS } from "@/lib/bookings/industry-presets";
import type { BookingForm, BookingFormField, BookingHours } from "@/types/booking-form";

const DAY_LABELS: { key: keyof BookingHours; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function CompanyBookingFormClient({
  slug,
  companyId,
  industrySlug,
  initialForm,
  initialBookingHours,
  initialBlockedDates,
}: {
  slug: string;
  companyId: string;
  industrySlug: string | null;
  initialForm: BookingForm;
  initialBookingHours: BookingHours;
  initialBlockedDates: string[];
}) {
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

  const customFields = fields.filter((f) => !f.system);

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
      companyId,
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
  };

  const onPublish = async () => {
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await publishBookingForm({
      companyId,
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
  };

  const onResetPreset = async () => {
    if (!confirm("Reset to industry preset? Unsaved customizations will be replaced.")) {
      return;
    }
    setPending(true);
    const result = await resetBookingFormToIndustryPreset({
      companyId,
      companySlug: slug,
      industrySlug,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.reload();
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
      companyId,
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

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Booking engine
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Booking form settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Configure the form external websites and the embed widget load via the public API.
          Publish when ready — draft changes are not visible publicly.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Status:{" "}
          <span className="font-semibold capitalize text-slate-700">
            {initialForm.status}
          </span>
          {initialForm.status === "published" ? ` · v${initialForm.version}` : null}
        </p>
        <p className="mt-1 font-mono text-xs text-slate-500">
          Public business ID: {companyId}
        </p>
      </header>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mb-4 text-sm text-emerald-600">{success}</p> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        <Button className="rounded-xl" disabled={pending} onClick={onSaveDraft}>
          Save draft
        </Button>
        <Button className="rounded-xl" variant="default" disabled={pending} onClick={onPublish}>
          Publish form
        </Button>
        <Button className="rounded-xl" variant="outline" disabled={pending} onClick={onResetPreset}>
          Reset to industry preset
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Form fields</h2>
          <p className="mt-1 text-sm text-slate-500">
            System fields cannot be removed. Customize labels and add business-specific fields.
          </p>
          <ul className="mt-4 space-y-3">
            {fields.map((field) => (
              <li
                key={field.key}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      value={field.label}
                      onChange={(e) => updateField(field.key, { label: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium"
                    />
                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                      {field.key} · {field.type}
                      {field.system ? " · system" : ""}
                    </p>
                  </div>
                  {!field.system ? (
                    <button
                      type="button"
                      onClick={() => removeField(field.key)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(e) =>
                      updateField(field.key, { required: e.target.checked })
                    }
                  />
                  Required
                </label>
              </li>
            ))}
          </ul>
          <Button className="mt-4 rounded-xl" variant="outline" onClick={addCustomField}>
            + Add custom field
          </Button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Preview</h2>
          <p className="mt-1 text-sm text-slate-500">
            Approximate public form layout ({customFields.length} custom fields).
          </p>
          <div className="mt-4 space-y-3">
            {fields.map((field) => (
              <label key={field.key} className="block text-sm">
                <span className="font-medium text-slate-800">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {field.type === "textarea" || field.type === "address" ? (
                  <textarea
                    readOnly
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    rows={2}
                  />
                ) : field.type === "consent" ? (
                  <span className="mt-1 block text-xs text-slate-500">Checkbox</span>
                ) : (
                  <input
                    readOnly
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                )}
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Industry presets available: {INDUSTRY_PRESET_SLUGS.join(", ")}
          </p>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Booking availability</h2>
        <p className="mt-1 text-sm text-slate-500">
          Set weekly hours and blocked dates. Public bookings are validated against these rules.
        </p>
        <div className="mt-4 space-y-3">
          {DAY_LABELS.map(({ key, label }) => {
            const day = bookingHours[key] ?? { open: "09:00", close: "17:00" };
            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
              >
                <span className="w-24 text-sm font-medium text-slate-800">{label}</span>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={Boolean(day.closed)}
                    onChange={(e) => updateDayHours(key, { closed: e.target.checked })}
                  />
                  Closed
                </label>
                {!day.closed ? (
                  <>
                    <input
                      type="time"
                      value={day.open}
                      onChange={(e) => updateDayHours(key, { open: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="time"
                      value={day.close}
                      onChange={(e) => updateDayHours(key, { close: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-800">Blocked dates</span>
          <span className="mt-1 block text-xs text-slate-500">
            One YYYY-MM-DD date per line (holidays, closures).
          </span>
          <textarea
            value={blockedDatesText}
            onChange={(e) => setBlockedDatesText(e.target.value)}
            className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
            placeholder={"2026-12-25\n2026-01-01"}
          />
        </label>
        <Button className="mt-4 rounded-xl" disabled={pending} onClick={onSaveAvailability}>
          Save availability
        </Button>
      </section>
    </div>
  );
}
