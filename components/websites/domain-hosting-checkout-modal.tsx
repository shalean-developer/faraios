"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { DomainHostingCheckout } from "@/components/websites/domain-hosting-checkout";
import type { HostingPlanRow } from "@/types/hosting-automation";

type Props = {
  open: boolean;
  onClose: () => void;
  slug: string;
  companyId: string;
  domain: string;
  plans: HostingPlanRow[];
  billingEmail?: string | null;
  returnPath?: string;
};

export function DomainHostingCheckoutModal({
  open,
  onClose,
  slug,
  companyId,
  domain,
  plans,
  billingEmail,
  returnPath,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !domain) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        aria-label="Close hosting plans"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-hosting-modal-title"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-b from-violet-50/80 to-white px-5 py-4">
          <div>
            <h2
              id="domain-hosting-modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              Choose a hosting plan
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{domain}</span> needs FaraiOS hosting
              before it can go live. Plesk setup, DNS sync, and site wiring run automatically
              after payment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-5 py-5">
          <DomainHostingCheckout
            slug={slug}
            companyId={companyId}
            domain={domain}
            plans={plans}
            billingEmail={billingEmail}
            layout="plain"
            returnPath={returnPath}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
