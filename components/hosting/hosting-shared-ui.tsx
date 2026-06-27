"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_HOSTING_LINKS = [
  { href: "/admin/hosting", label: "Overview" },
  { href: "/admin/hosting/service-plans", label: "Service plans" },
  { href: "/admin/hosting/plans", label: "FaraiOS plans" },
  { href: "/admin/hosting/orders", label: "Orders" },
  { href: "/admin/hosting/services", label: "Services" },
  { href: "/admin/hosting/domains", label: "Domains" },
  { href: "/admin/hosting/dns", label: "DNS" },
  { href: "/admin/hosting/mailboxes", label: "Mailboxes" },
  { href: "/admin/hosting/ftp", label: "FTP" },
  { href: "/admin/hosting/databases", label: "Databases" },
  { href: "/admin/hosting/servers", label: "Servers" },
  { href: "/admin/hosting/provisioning-logs", label: "Provisioning logs" },
  { href: "/admin/hosting/settings", label: "Settings" },
];

export function AdminHostingNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {ADMIN_HOSTING_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            pathname === link.href || (link.href !== "/admin/hosting" && pathname.startsWith(link.href))
              ? "bg-[#5a8dee] text-white"
              : "text-[#717d96] hover:bg-[#f5f7fb] hover:text-[#4b5563]"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function HostingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    paid: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    pending: "bg-amber-50 text-amber-800 ring-amber-100",
    unpaid: "bg-amber-50 text-amber-800 ring-amber-100",
    provisioning: "bg-blue-50 text-blue-800 ring-blue-100",
    suspended: "bg-red-50 text-red-800 ring-red-100",
    failed: "bg-red-50 text-red-800 ring-red-100",
    cancelled: "bg-slate-50 text-slate-600 ring-slate-100",
    terminated: "bg-slate-50 text-slate-600 ring-slate-100",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    open: "bg-blue-50 text-blue-800 ring-blue-100",
    closed: "bg-slate-50 text-slate-600 ring-slate-100",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        styles[status] ?? styles.pending
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function formatHostingAmount(cents: number, currency = "ZAR"): string {
  if (currency === "ZAR") {
    return `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  }
  return `${(cents / 100).toFixed(2)} ${currency}`;
}
