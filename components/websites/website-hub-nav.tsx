"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Key, LineChart, Server } from "lucide-react";

import {
  companyHostingPath,
  companyWebsiteApiKeysPath,
  companyWebsiteDomainsPath,
  companyWebsiteHostingPath,
  companyWebsiteTrackingPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";

export function WebsiteHubNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  const items = [
    { href: companyWebsitesPath(slug), label: "Overview", icon: Globe },
    { href: companyWebsiteDomainsPath(slug), label: "Domains", icon: Globe },
    { href: companyWebsiteApiKeysPath(slug), label: "API keys", icon: Key },
    { href: companyWebsiteTrackingPath(slug), label: "Tracking", icon: LineChart },
    { href: companyWebsiteHostingPath(slug), label: "Hosting", icon: Server },
    { href: companyHostingPath(slug), label: "Billing", icon: Server },
  ];

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-violet-100 text-violet-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
