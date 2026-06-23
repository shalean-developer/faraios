"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { getSegmentCustomersAction } from "@/app/actions/customer-segments";
import { Button } from "@/components/ui/button";
import { companyCustomerPath, companyCustomersPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CustomerSegment } from "@/types/v6-engine";

type SegmentCustomer = {
  id: string;
  name: string;
  email: string | null;
};

const SEGMENT_ACCENT: Record<string, string> = {
  high_value: "border-amber-200 bg-amber-50/50",
  repeat: "border-violet-200 bg-violet-50/50",
  inactive: "border-slate-200 bg-slate-50",
  new: "border-emerald-200 bg-emerald-50/50",
  custom: "border-slate-200 bg-white",
};

export function CompanyCustomerSegmentsClient({
  slug,
  companyId,
  segments,
}: {
  slug: string;
  companyId: string;
  segments: CustomerSegment[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customersBySegment, setCustomersBySegment] = useState<
    Record<string, SegmentCustomer[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleSegment = (segment: CustomerSegment) => {
    if (expandedId === segment.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(segment.id);
    setError(null);

    if (customersBySegment[segment.id]) return;

    startTransition(async () => {
      const result = await getSegmentCustomersAction({
        companyId,
        segmentType: segment.segmentType,
        criteria: segment.criteria,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCustomersBySegment((current) => ({
        ...current,
        [segment.id]: result.customers,
      }));
    });
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={companyCustomersPath(slug)}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to customers
      </Link>

      <header className="mt-4 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Customers
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Customer segments</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Smart groups based on spend, booking activity, and recency. Use these for
          retention outreach and targeted follow-ups.
        </p>
      </header>

      {error ? (
        <p className="mb-4 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {segments.map((segment) => {
          const isExpanded = expandedId === segment.id;
          const customers = customersBySegment[segment.id] ?? [];
          const accent = SEGMENT_ACCENT[segment.segmentType] ?? SEGMENT_ACCENT.custom;

          return (
            <div
              key={segment.id}
              className={cn(
                "overflow-hidden rounded-2xl border shadow-sm",
                accent
              )}
            >
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {segment.segmentType.replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">{segment.name}</p>
                {segment.description ? (
                  <p className="mt-2 text-sm text-slate-600">{segment.description}</p>
                ) : null}
                <p className="mt-4 text-3xl font-bold text-violet-600">
                  {segment.customerCount ?? 0}
                </p>
                <p className="text-sm text-slate-500">customers</p>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 rounded-xl bg-white/80"
                  onClick={() => toggleSegment(segment)}
                  disabled={pending && expandedId === segment.id}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Hide customers
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      View customers
                    </>
                  )}
                </Button>
              </div>

              {isExpanded ? (
                <div className="border-t border-slate-200/80 bg-white/90 px-5 py-4">
                  {pending && !customers.length ? (
                    <p className="text-sm text-slate-500">Loading customers...</p>
                  ) : customers.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No customers in this segment yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {customers.map((customer) => (
                        <li key={customer.id} className="py-2.5">
                          <Link
                            href={companyCustomerPath(slug, customer.id)}
                            className="font-medium text-violet-700 hover:text-violet-900"
                          >
                            {customer.name}
                          </Link>
                          {customer.email ? (
                            <p className="text-xs text-slate-500">{customer.email}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
