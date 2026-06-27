import Link from "next/link";

import { companyHostingOrderPath } from "@/lib/paths/company";

export function CompanyHostingLegacyBanner({
  slug,
  hasLegacySubscription,
  hasAutomationServices,
}: {
  slug: string;
  hasLegacySubscription: boolean;
  hasAutomationServices: boolean;
}) {
  if (!hasLegacySubscription || hasAutomationServices) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
      Your FaraiOS website hosting subscription is active. Order managed hosting to
      provision domains, mailboxes, FTP accounts, and databases here.{" "}
      <Link href={companyHostingOrderPath(slug)} className="font-semibold underline">
        Order hosting
      </Link>
    </div>
  );
}
