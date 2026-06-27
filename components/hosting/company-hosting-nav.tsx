"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  companyBillingPath,
  companyHostingDatabasesPath,
  companyHostingDomainsPath,
  companyHostingFtpPath,
  companyHostingInvoicesPath,
  companyHostingMailboxesPath,
  companyHostingOrderPath,
  companyHostingPath,
  companyHostingServicesPath,
  companyHostingSupportPath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";

export function CompanyHostingNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const overviewHref = companyHostingPath(slug);
  const billingPath = companyBillingPath(slug);
  const isHostingOverview =
    pathname === overviewHref ||
    (pathname === billingPath &&
      (!searchParams.get("tab") || searchParams.get("tab") === "hosting"));
  const links = [
    { href: overviewHref, label: "Overview" },
    { href: companyHostingOrderPath(slug), label: "Order hosting" },
    { href: companyHostingServicesPath(slug), label: "Services" },
    { href: companyHostingDomainsPath(slug), label: "Domains" },
    { href: companyHostingMailboxesPath(slug), label: "Mailboxes" },
    { href: companyHostingFtpPath(slug), label: "FTP" },
    { href: companyHostingDatabasesPath(slug), label: "Databases" },
    { href: companyHostingInvoicesPath(slug), label: "Invoices" },
    { href: companyHostingSupportPath(slug), label: "Support" },
  ];

  const isActive = (href: string) =>
    href === overviewHref
      ? isHostingOverview
      : pathname === href ||
        (href !== overviewHref && pathname.startsWith(`${href}/`));

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200/80 pb-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
            isActive(link.href)
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
