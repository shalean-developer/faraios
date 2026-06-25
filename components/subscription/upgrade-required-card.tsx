import Link from "next/link";
import { ArrowUpCircle } from "lucide-react";

import {
  planLabelForUpgrade,
  type EntitlementFeature,
} from "@/lib/subscriptions/plan-entitlements";
import { companyBillingPath } from "@/lib/paths/company";

type Props = {
  slug: string;
  feature: EntitlementFeature;
  title?: string;
  description?: string;
};

export function UpgradeRequiredCard({
  slug,
  feature,
  title = "Upgrade to unlock this feature",
  description,
}: Props) {
  const planLabel = planLabelForUpgrade(feature);
  const body =
    description ??
    `This feature requires the ${planLabel} plan. Upgrade your plan to get access.`;

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/80 to-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
        <ArrowUpCircle className="h-6 w-6 text-violet-600" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-violet-600">
        Required plan: {planLabel}
      </p>
      <Link
        href={companyBillingPath(slug)}
        className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700"
      >
        Upgrade plan
      </Link>
    </div>
  );
}
