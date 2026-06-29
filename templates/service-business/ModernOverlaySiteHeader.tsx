"use client";

import { Home, Menu, X } from "lucide-react";
import { useState } from "react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { SiteLogoMark } from "@/templates/service-business/site-logo";
import { ModernOverlayTopbar } from "@/templates/service-business/ModernOverlayTopbar";
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
  { label: "About", page: "about", hrefKey: "about" },
  { label: "Services", page: "services", hrefKey: "services" },
  { label: "Projects", page: "services", hrefKey: "services" },
  { label: "Contact", page: "contact", hrefKey: "contact" },
];

export function ModernOverlaySiteHeader({
  site,
  paths,
  bookingUrl,
  overlay = false,
  activePage = "home",
}: Props) {
  const [open, setOpen] = useState(false);
  const { businessName, hero, topbar, theme } = site;
  const bookHref = bookingUrl ?? resolveTemplateHref(hero.ctaHref, paths);
  const hideBusinessName =
    topbar.hideBusinessNameInHeader && Boolean(topbar.logo?.trim());

  const headerShell = overlay
    ? "relative z-20 bg-black/45 backdrop-blur-[2px]"
    : "sticky top-0 z-50 bg-[#1a1a1a]";

  return (
    <div className={overlay ? "relative z-20" : ""}>
      <ModernOverlayTopbar site={site} />
      <header className={headerShell}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <a href={paths.home} className="flex min-w-0 shrink-0 items-center gap-3">
            <SiteLogoMark
              logo={topbar.logo}
              alt={businessName}
              size={topbar.logoSize}
              width={topbar.logoWidth}
              shape={topbar.logoShape}
              useLuxuryImage
              fallback={
                <span
                  className="flex h-full w-full items-center justify-center text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Home className="h-5 w-5" strokeWidth={2} />
                </span>
              }
            />
            {hideBusinessName ? null : (
              <span className="truncate text-lg font-bold text-white">{businessName}</span>
            )}
          </a>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={paths[item.hrefKey]}
                className={
                  item.page === activePage
                    ? "text-sm font-semibold text-white"
                    : "text-sm font-medium text-white/90 transition hover:text-white"
                }
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex">
            <a
              href={bookHref}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: theme.accent }}
            >
              Book A Free Consultation
            </a>
          </div>

          <button
            type="button"
            className="inline-flex rounded-lg border border-white/20 p-2 text-white lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-white/10 bg-black/90 px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {NAV.map((item) => (
                <a
                  key={item.label}
                  href={paths[item.hrefKey]}
                  className="rounded-lg px-3 py-3 text-base font-medium text-white/90 hover:bg-white/10"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <a
                href={bookHref}
                className="mt-3 rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: theme.accent }}
                onClick={() => setOpen(false)}
              >
                Book A Free Consultation
              </a>
            </nav>
          </div>
        ) : null}
      </header>
    </div>
  );
}
