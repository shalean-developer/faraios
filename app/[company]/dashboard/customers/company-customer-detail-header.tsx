"use client";

import { useState } from "react";

import { CustomerFormPopover } from "@/components/company/customer-form-popover";
import {
  riseCardClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/database";

export function CompanyCustomerDetailHeader({
  slug,
  companyId,
  customer,
}: {
  slug: string;
  companyId: string;
  customer: Customer;
}) {
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  return (
    <>
      <div className={cn(riseCardClassName, "mt-4")}>
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <h1 className="text-lg font-medium text-slate-800">{customer.name}</h1>
          </div>
          <button
            type="button"
            className={risePrimaryButtonClassName}
            onClick={() => setShowCustomerForm(true)}
          >
            Edit customer
          </button>
        </div>
      </div>

      <CustomerFormPopover
        open={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        slug={slug}
        companyId={companyId}
        customer={customer}
      />
    </>
  );
}
