"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatRevenue } from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";
import type { BookingFormField, ServiceAddon } from "@/types/booking-form";
import type { CompanyService } from "@/types/database";

type SubmitPayload = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceId?: string;
  service?: string;
  bookingDate: string;
  preferredTime?: string;
  address?: string;
  notes?: string;
  consentGiven?: boolean;
  customResponses?: Record<string, unknown>;
  addons?: ServiceAddon[];
};

type Props = {
  businessName: string;
  fields: BookingFormField[];
  services: Pick<CompanyService, "id" | "name" | "base_price_cents" | "addons">[];
  onSubmit: (payload: SubmitPayload) => Promise<{ ok: true } | { ok: false; error: string }>;
  mode?: "public" | "admin";
  formTitle?: string;
  formDescription?: string;
  submitLabel?: string;
  successMessage?: string;
  onSuccess?: () => void;
  embedded?: boolean;
  preview?: boolean;
};

function initialValues(fields: BookingFormField[]): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of fields) {
    if (field.type === "consent") values[field.key] = false;
    else if (field.defaultValue != null) values[field.key] = String(field.defaultValue);
    else values[field.key] = "";
  }
  return values;
}

export function DynamicPublicBookingForm({
  businessName,
  fields,
  services,
  onSubmit,
  mode = "public",
  formTitle,
  formDescription,
  submitLabel,
  successMessage,
  onSuccess,
  embedded = false,
  preview = false,
}: Props) {
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    initialValues(fields)
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedServiceId = String(values.service_id ?? "");
  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );
  const availableAddons = useMemo(() => {
    if (!selectedService?.addons || !Array.isArray(selectedService.addons)) return [];
    return selectedService.addons as ServiceAddon[];
  }, [selectedService]);

  const validSelectedAddonIds = useMemo(
    () =>
      selectedAddonIds.filter((id) => availableAddons.some((addon) => addon.id === id)),
    [selectedAddonIds, availableAddons]
  );

  const setValue = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key === "service_id") {
      setSelectedAddonIds([]);
    }
  };

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.sortOrder - b.sortOrder),
    [fields]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (preview) return;
    setError(null);
    setSuccess(false);

    const customResponses: Record<string, unknown> = {};
    for (const field of sortedFields) {
      if (field.system) continue;
      const value = values[field.key];
      if (value !== "" && value !== false) customResponses[field.key] = value;
    }

    const bookingDate =
      String(values.booking_date ?? "") ||
      String(values.preferred_date ?? "") ||
      new Date().toISOString();

    startTransition(async () => {
      const selectedAddons = availableAddons.filter((addon) =>
        validSelectedAddonIds.includes(addon.id)
      );

      const result = await onSubmit({
        customerName: String(values.customer_name ?? ""),
        customerEmail: String(values.customer_email ?? "") || undefined,
        customerPhone: String(values.customer_phone ?? "") || undefined,
        serviceId: String(values.service_id ?? "") || undefined,
        service: String(values.service ?? "") || undefined,
        bookingDate,
        preferredTime: String(values.preferred_time ?? "") || undefined,
        address: String(values.address ?? "") || undefined,
        notes: String(values.notes ?? "") || undefined,
        consentGiven: Boolean(values.consent),
        customResponses,
        addons: selectedAddons.length > 0 ? selectedAddons : undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setValues(initialValues(fields));
      setSelectedAddonIds([]);
      onSuccess?.();
    });
  };

  const title =
    formTitle ?? (mode === "admin" ? "Create booking request" : `Book ${businessName}`);
  const description =
    formDescription ??
    (mode === "admin"
      ? "Fill in the configured booking form on behalf of a customer."
      : "Submit your request and the business will confirm your booking.");
  const submitText =
    submitLabel ?? (mode === "admin" ? "Create booking request" : "Request booking");
  const successText =
    successMessage ??
    (mode === "admin"
      ? "Booking request created for the customer."
      : "Booking request sent. The business will contact you to confirm.");

  const renderField = (field: BookingFormField) => {
    if (field.type === "hidden") return null;

    if (field.key === "service_id" && services.length > 0) {
      return (
        <label key={field.key} className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required ? " *" : ""}
          <select
            required={field.required}
            value={String(values[field.key] ?? "")}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Select a service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} — {formatRevenue(service.base_price_cents)}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "consent") {
      return (
        <label key={field.key} className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(values[field.key])}
            onChange={(e) => setValue(field.key, e.target.checked)}
            required={field.required}
            className="mt-1"
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.type === "textarea" || field.type === "address") {
      return (
        <label key={field.key} className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required ? " *" : ""}
          <textarea
            required={field.required}
            value={String(values[field.key] ?? "")}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            rows={3}
            placeholder={field.placeholder}
          />
        </label>
      );
    }

    if (field.type === "dropdown" || field.type === "radio") {
      return (
        <label key={field.key} className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required ? " *" : ""}
          <select
            required={field.required}
            value={String(values[field.key] ?? "")}
            onChange={(e) => setValue(field.key, e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }

    const inputType =
      field.type === "email"
        ? "email"
        : field.type === "phone"
          ? "tel"
          : field.type === "number"
            ? "number"
            : field.type === "date"
              ? "date"
              : field.type === "time"
                ? "time"
                : "text";

    return (
      <label key={field.key} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required ? " *" : ""}
        <input
          required={field.required}
          type={inputType}
          value={String(values[field.key] ?? "")}
          onChange={(e) => setValue(field.key, e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder={field.placeholder}
        />
      </label>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "space-y-4",
        embedded
          ? "p-0"
          : "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      )}
    >
      {!embedded && (title || description) ? (
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {sortedFields.map((field) => (
          <div
            key={field.key}
            className={
              field.type === "textarea" || field.type === "address" || field.type === "consent"
                ? "sm:col-span-2"
                : undefined
            }
          >
            {renderField(field)}
          </div>
        ))}
      </div>

      {availableAddons.length > 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
          <p className="text-sm font-medium text-gray-800">Optional add-ons</p>
          <div className="mt-2 space-y-2">
            {availableAddons.map((addon) => (
              <label key={addon.id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={validSelectedAddonIds.includes(addon.id)}
                  onChange={(e) => {
                    setSelectedAddonIds((current) =>
                      e.target.checked
                        ? [...current, addon.id]
                        : current.filter((id) => id !== addon.id)
                    );
                  }}
                />
                <span>
                  {addon.name} — {formatRevenue(addon.price_cents)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {error && !preview ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success && !preview ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successText}
        </p>
      ) : null}

      {preview ? (
        <p className="text-xs text-slate-500">Live preview — submit is disabled here.</p>
      ) : (
        <Button type="submit" disabled={isPending} className="rounded-xl">
          {isPending ? "Saving…" : submitText}
        </Button>
      )}
    </form>
  );
}
