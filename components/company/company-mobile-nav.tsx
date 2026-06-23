"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import {
  companyNavItems,
  type CompanyNavKey,
} from "@/lib/constants/company-nav";

export function CompanyMobileNav({
  slug,
  activeNav,
  companyName,
  hasWebsiteProject = false,
}: {
  slug: string;
  activeNav: CompanyNavKey;
  companyName: string;
  hasWebsiteProject?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const items = companyNavItems(slug, { hasWebsiteProject });

  return (
    <div className="border-b border-slate-200 bg-white lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{companyName}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">
            Workspace
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <nav className="border-t border-slate-100 px-3 py-3">
          <ul className="grid gap-1">
            {items.map((item) => {
              const isActive = activeNav === item.key;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? "bg-violet-600 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
