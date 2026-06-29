"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { SiteLogoMark } from "@/templates/service-business/site-logo";
import { luxury } from "@/templates/service-business/luxury-styles";
import {
  resolveTemplateHref,
  type TemplatePaths,
  type TemplatePage,
} from "@/templates/service-business/paths";

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
  bookingUrl?: string | null;
  overlay?: boolean;
  activePage?: TemplatePage | "home";
};

const NAV: { label: string; page: TemplatePage | "home"; hrefKey: keyof TemplatePaths }[] = [
  { label: "Home", page: "home", hrefKey: "home" },
  { label: "About Us", page: "about", hrefKey: "about" },
  { label: "Services", page: "services", hrefKey: "services" },
  { label: "Blog", page: "blog", hrefKey: "blog" },
  { label: "Testimonials", page: "reviews", hrefKey: "reviews" },
];

export function LuxurySiteHeader({
  site,
  paths,
  bookingUrl,
  overlay = false,
  activePage = "home",
}: Props) {
  const [open, setOpen] = useState(false);
  const { businessName, hero, topbar } = site;
  const bookHref = bookingUrl ?? resolveTemplateHref(hero.ctaHref, paths);

  const shellClass = overlay
    ? "absolute inset-x-0 top-0 z-30 bg-transparent"
    : "sticky top-0 z-50 border-b border-[rgba(232,223,208,0.12)] bg-[#1f1612]";

  const linkBase = overlay
    ? "text-[#e8dfd0]/90 transition hover:text-white"
    : "text-[#e8dfd0]/85 transition hover:text-white";

  const logoClass = overlay ? "text-[#f5f0e8]" : "text-[#f5f0e8]";
  const hideBusinessName =
    topbar.hideBusinessNameInHeader && Boolean(topbar.logo?.trim());

  return (
    <header className={shellClass}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-5 sm:px-8 lg:py-6">
        <a href={paths.home} className="flex min-w-0 shrink-0 items-center gap-3">
          <SiteLogoMark
            logo={topbar.logo}
            alt={businessName}
            size={topbar.logoSize}
            width={topbar.logoWidth}
            shape={topbar.logoShape}
            className="ring-1 ring-white/20"
            useLuxuryImage
          />
          {hideBusinessName ? null : (
            <span
              className={`truncate text-lg font-semibold uppercase tracking-[0.22em] sm:text-xl ${logoClass}`}
              style={{ fontFamily: luxury.serif }}
            >
              {businessName}
            </span>
          )}
        </a>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const isActive = item.page === activePage;
            return (
              <a
                key={item.label}
                href={paths[item.hrefKey]}
                className={
                  isActive
                    ? "rounded-full bg-[#e8dfd0] px-4 py-2 text-sm font-medium tracking-wide text-[#1f1612] shadow-sm hover:text-[#1f1612]"
                    : `rounded-full px-4 py-2 text-sm font-medium tracking-wide ${linkBase}`
                }
                style={{ fontFamily: luxury.sans }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center lg:flex">
          <a
            href={bookHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#e8dfd0] px-5 py-2.5 text-sm font-semibold text-[#1f1612] transition hover:bg-[#f5f0e8]"
            style={{ fontFamily: luxury.sans }}
          >
            Book a Call
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
          </a>
        </div>

        <button
          type="button"
          className="inline-flex rounded-full border border-white/20 p-2.5 text-[#e8dfd0] lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div
          className="border-t px-5 py-5 lg:hidden"
          style={{
            borderColor: luxury.border,
            backgroundColor: overlay ? "rgba(26, 18, 14, 0.92)" : luxury.inkSoft,
          }}
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={paths[item.hrefKey]}
                className="rounded-lg px-3 py-3 text-base font-medium text-[#e8dfd0] transition hover:bg-white/5"
                style={{ fontFamily: luxury.sans }}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              href={bookHref}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#e8dfd0] px-5 py-3 text-sm font-semibold text-[#1f1612]"
              style={{ fontFamily: luxury.sans }}
              onClick={() => setOpen(false)}
            >
              Book a Call
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
