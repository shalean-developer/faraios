"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { calculateBookingPrice } from "@/lib/bookings/pricing-calculator";
import { formatRevenue } from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";
import type {
  BookingFormExtra,
  BookingFormField,
  BookingFormPricingRule,
  BookingFormSettings,
  ServiceAddon,
} from "@/types/booking-form";
import type { CompanyService } from "@/types/database";

const STEPS = [
  "Service",
  "Property",
  "Extras",
  "Frequency",
  "Schedule",
  "Address",
  "Details",
  "Review",
] as const;

type SubmitPayload = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceId?: string;
  bookingDate: string;
  preferredTime?: string;
  address?: string;
  notes?: string;
  consentGiven?: boolean;
  customResponses?: Record<string, unknown>;
  addons?: ServiceAddon[];
  extraIds?: string[];
  calculatedTotalCents?: number;
};

type Props = {
  businessName: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  fields: BookingFormField[];
  services: Pick<CompanyService, "id" | "name" | "base_price_cents" | "addons" | "description">[];
  extras: BookingFormExtra[];
  pricingRule: BookingFormPricingRule | null;
  settings: BookingFormSettings;
  onSubmit: (payload: SubmitPayload) => Promise<{ ok: true } | { ok: false; error: string }>;
  embedded?: boolean;
  preview?: boolean;
};

export function SteppedPublicBookingForm({
  businessName,
  logoUrl,
  brandColor = "#6d28d9",
  fields,
  services,
  extras,
  pricingRule,
  settings,
  onSubmit,
  embedded = false,
  preview = false,
}: Props) {
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [address, setAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  const availableAddons = useMemo(() => {
    if (!selectedService?.addons || !Array.isArray(selectedService.addons)) return [];
    return selectedService.addons as ServiceAddon[];
  }, [selectedService]);

  const activeExtras = useMemo(() => extras.filter((e) => e.active), [extras]);

  const frequencyOptions = useMemo(() => {
    const field = fields.find((f) => f.key === "frequency");
    return field?.options ?? ["Once-off", "Weekly", "Bi-weekly", "Monthly"];
  }, [fields]);

  const propertyTypeOptions = useMemo(() => {
    const field = fields.find((f) => f.key === "property_type");
    return field?.options ?? ["House", "Apartment", "Office", "Other"];
  }, [fields]);

  const selectedAddons = availableAddons.filter((a) => selectedAddonIds.includes(a.id));
  const selectedExtrasList = activeExtras.filter((e) => selectedExtraIds.includes(e.id));

  const pricing = useMemo(
    () =>
      calculateBookingPrice({
        serviceBasePriceCents: selectedService?.base_price_cents ?? 0,
        bedrooms: Number(bedrooms) || 0,
        bathrooms: Number(bathrooms) || 0,
        frequency,
        selectedAddons,
        selectedExtras: selectedExtrasList,
        pricingRule,
      }),
    [
      selectedService,
      bedrooms,
      bathrooms,
      frequency,
      selectedAddons,
      selectedExtrasList,
      pricingRule,
    ]
  );

  const accent = brandColor ?? "#6d28d9";
  const confirmationMessage =
    settings.confirmationMessage ??
    "Thank you! Your booking request has been received. We will confirm your appointment shortly.";

  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return Boolean(serviceId);
      case 1:
        return Boolean(propertyType);
      case 4:
        return Boolean(bookingDate);
      case 6:
        return Boolean(customerName.trim());
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    if (preview) return;
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        serviceId,
        bookingDate,
        preferredTime: preferredTime || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        consentGiven: consent,
        addons: selectedAddons.length > 0 ? selectedAddons : undefined,
        extraIds: selectedExtraIds.length > 0 ? selectedExtraIds : undefined,
        calculatedTotalCents: pricing.requiresCustomQuote ? undefined : pricing.totalCents,
        customResponses: {
          property_type: propertyType,
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
          bathrooms: bathrooms ? Number(bathrooms) : undefined,
          frequency,
          extras: selectedExtrasList.map((e) => e.name),
        },
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  };

  if (success && !preview) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm",
          embedded ? "" : "mx-auto max-w-lg"
        )}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: accent }}
        >
          ✓
        </div>
        <h2 className="text-xl font-bold text-slate-900">Booking submitted</h2>
        <p className="mt-2 text-sm text-slate-600">{confirmationMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        embedded ? "" : "mx-auto max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      )}
    >
      {!embedded ? (
        <header className="mb-6 text-center">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={businessName}
              width={120}
              height={48}
              className="mx-auto mb-3 h-12 w-auto object-contain"
              unoptimized
            />
          ) : null}
          <h1 className="text-xl font-bold text-slate-900">Book {businessName}</h1>
          <p className="mt-1 text-sm text-slate-500">Complete the steps below to request your clean.</p>
        </header>
      ) : null}

      <div className="mb-6 flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
              index === step
                ? "text-white"
                : index < step
                  ? "bg-slate-100 text-slate-600"
                  : "bg-slate-50 text-slate-400"
            )}
            style={index === step ? { backgroundColor: accent } : undefined}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      <div className="min-h-[220px] space-y-4">
        {step === 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">Select a service</p>
            {services.length === 0 ? (
              <p className="text-sm text-amber-800">No services available yet.</p>
            ) : (
              services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setServiceId(service.id);
                    setSelectedAddonIds([]);
                  }}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    serviceId === service.id
                      ? "border-violet-300 bg-violet-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                  style={
                    serviceId === service.id
                      ? { borderColor: accent, backgroundColor: `${accent}10` }
                      : undefined
                  }
                >
                  <p className="font-semibold text-slate-900">{service.name}</p>
                  {service.description ? (
                    <p className="mt-1 text-xs text-slate-500">{service.description}</p>
                  ) : null}
                  <p className="mt-2 text-sm font-medium" style={{ color: accent }}>
                    From {formatRevenue(service.base_price_cents)}
                  </p>
                </button>
              ))
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-800">
              Property type
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {propertyTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-800">
                Bedrooms
                <input
                  type="number"
                  min={0}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-slate-800">
                Bathrooms
                <input
                  type="number"
                  min={0}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">Optional extras</p>
            {availableAddons.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Service add-ons</p>
                {availableAddons.map((addon) => (
                  <label key={addon.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAddonIds.includes(addon.id)}
                      onChange={(e) =>
                        setSelectedAddonIds((ids) =>
                          e.target.checked
                            ? [...ids, addon.id]
                            : ids.filter((id) => id !== addon.id)
                        )
                      }
                    />
                    {addon.name} — {formatRevenue(addon.price_cents)}
                  </label>
                ))}
              </div>
            ) : null}
            {activeExtras.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Additional extras</p>
                {activeExtras.map((extra) => (
                  <label key={extra.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedExtraIds.includes(extra.id)}
                      onChange={(e) =>
                        setSelectedExtraIds((ids) =>
                          e.target.checked
                            ? [...ids, extra.id]
                            : ids.filter((id) => id !== extra.id)
                        )
                      }
                    />
                    {extra.name} — {formatRevenue(extra.price_cents)}
                  </label>
                ))}
              </div>
            ) : null}
            {availableAddons.length === 0 && activeExtras.length === 0 ? (
              <p className="text-sm text-slate-500">No extras configured — continue to the next step.</p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <label className="block text-sm font-medium text-slate-800">
            How often do you need cleaning?
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select frequency</option>
              {frequencyOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">
              Preferred date *
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Preferred time
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-800">
              Service address
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Street, suburb, city"
              />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Notes / instructions
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-800">
              Full name *
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Email
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Phone
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              I agree to be contacted about this booking request.
            </label>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">{selectedService?.name}</p>
              <p className="mt-1 text-slate-600">
                {propertyType}
                {bedrooms ? ` · ${bedrooms} bed` : ""}
                {bathrooms ? ` · ${bathrooms} bath` : ""}
              </p>
              <p className="mt-1 text-slate-600">
                {bookingDate}
                {preferredTime ? ` at ${preferredTime}` : ""}
              </p>
              {address ? <p className="mt-1 text-slate-600">{address}</p> : null}
            </div>
            {pricing.requiresCustomQuote ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Custom quote required — we will contact you with pricing.
              </p>
            ) : (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Price estimate</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {pricing.breakdown.map((line, lineIndex) => (
                    <li key={`${lineIndex}-${line.label}`} className="flex justify-between gap-4">
                      <span>{line.label}</span>
                      <span>{formatRevenue(line.amountCents)}</span>
                    </li>
                  ))}
                </ul>
                <p
                  className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900"
                >
                  <span>Total</span>
                  <span style={{ color: accent }}>{formatRevenue(pricing.totalCents)}</span>
                </p>
                {settings.paymentRequired ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Payment will be collected after the business confirms your booking.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {error && !preview ? (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex gap-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setStep((s) => s - 1)}
            disabled={isPending}
          >
            Back
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            className="ml-auto rounded-xl"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
            style={{ backgroundColor: accent }}
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            className="ml-auto rounded-xl"
            disabled={isPending || preview}
            onClick={handleSubmit}
            style={{ backgroundColor: accent }}
          >
            {isPending ? "Submitting…" : preview ? "Preview only" : "Submit booking"}
          </Button>
        )}
      </div>
    </div>
  );
}
