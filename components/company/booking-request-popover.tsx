"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createBookingFromConfiguredForm } from "@/app/actions/bookings";
import { DynamicPublicBookingForm } from "@/components/booking/dynamic-public-booking-form";
import type { BookingForm } from "@/types/booking-form";
import type { CompanyService, CompanyWithIndustry } from "@/types/database";

export function BookingRequestPopover({
  open,
  onClose,
  slug,
  company,
  bookingForm,
  services,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  company: CompanyWithIndustry;
  bookingForm: BookingForm;
  services: CompanyService[];
}) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close booking form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-request-popover-title"
        className="relative z-10 flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <p
            id="booking-request-popover-title"
            className="text-sm font-semibold text-slate-900"
          >
            Create booking request
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">
          <DynamicPublicBookingForm
            businessName={company.name}
            fields={bookingForm.fields}
            services={services}
            mode="admin"
            embedded
            onSubmit={async (payload) =>
              createBookingFromConfiguredForm({
                companyId: company.id,
                companySlug: slug,
                customerName: payload.customerName,
                customerEmail: payload.customerEmail,
                customerPhone: payload.customerPhone,
                serviceId: payload.serviceId,
                service: payload.service ?? "",
                bookingDate: payload.bookingDate,
                preferredTime: payload.preferredTime,
                address: payload.address,
                notes: payload.notes,
                customResponses: payload.customResponses,
                consentGiven: payload.consentGiven,
                addons: payload.addons,
              })
            }
            onSuccess={() => {
              onClose();
              router.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}
