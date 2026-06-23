"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  bookingsSubNavItems,
  bookingsViewFromPathname,
  companyNavItems,
  type CompanyNavKey,
} from "@/lib/constants/company-nav";
import { cn } from "@/lib/utils";

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
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const items = companyNavItems(slug, { hasWebsiteProject });
  const bookingsSubNav = bookingsSubNavItems(slug);
  const activeBookingsView = bookingsViewFromPathname(slug, pathname);
  const isBookingsSection = activeNav === "bookings";
  const [bookingsExpanded, setBookingsExpanded] = useState(isBookingsSection);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    const bookingsBase = `/${encodeURIComponent(slug)}/dashboard/bookings`;
    const quotesBase = `/${encodeURIComponent(slug)}/dashboard/quotes`;
    const isBookingsPath = (path: string) =>
      path.startsWith(bookingsBase) || path.startsWith(quotesBase);

    const wasBookings = isBookingsPath(previousPathnameRef.current);
    const isNowBookings = isBookingsPath(pathname);

    if (isNowBookings && !wasBookings) {
      setBookingsExpanded(true);
    } else if (!isNowBookings) {
      setBookingsExpanded(false);
    }

    previousPathnameRef.current = pathname;
  }, [pathname, slug]);

  const handleBookingsClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isBookingsSection) {
      event.preventDefault();
      setBookingsExpanded((value) => !value);
      return;
    }
    setBookingsExpanded(true);
    setOpen(false);
  };

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
              const isBookings = item.key === "bookings";
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={isBookings ? handleBookingsClick : () => setOpen(false)}
                    aria-expanded={isBookings ? bookingsExpanded : undefined}
                    className={cn(
                      "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium",
                      isActive
                        ? "bg-violet-600 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>{item.label}</span>
                    {isBookings ? (
                      <ChevronDown
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform duration-200",
                          bookingsExpanded && "rotate-180",
                          isActive ? "text-white/80" : "text-slate-400"
                        )}
                      />
                    ) : null}
                  </Link>
                  {isBookings && bookingsExpanded ? (
                    <ul className="mt-1 space-y-0.5 border-l border-slate-200 pl-3">
                      {bookingsSubNav.map((subItem) => {
                        const isSubActive = activeBookingsView === subItem.key;
                        return (
                          <li key={subItem.key}>
                            <Link
                              href={subItem.href}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "block rounded-lg px-3 py-2 text-xs font-medium",
                                isSubActive
                                  ? "bg-violet-100 text-violet-800"
                                  : "text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
