"use client";

import { useState } from "react";
import { ChevronDown, Clock, Mail, MapPin, Menu, Phone, X } from "lucide-react";

import {
  getNavigationSettings,
  mobileNavItems,
  resolveNavItemHref,
  visibleNavItems,
} from "@/lib/website-builder/navigation";
import { publicBookPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type {
  BuilderWebsite,
  LandingPageContent,
  WebsiteServicePageRecord,
} from "@/types/website-builder";
import type { WebsiteNavItem, WebsiteNavigationSettings } from "@/types/website-builder-navigation";

type Props = {
  website: BuilderWebsite;
  companySlug: string;
  companyId: string;
  companyName: string;
  landing?: LandingPageContent | null;
  servicePages?: WebsiteServicePageRecord[];
  navigation?: WebsiteNavigationSettings;
  viewport?: "desktop" | "mobile";
  preview?: boolean;
};

function NavDropdown({
  item,
  ctx,
  primary,
  onNavigate,
}: {
  item: WebsiteNavItem;
  ctx: { companySlug: string; companyId: string };
  primary: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const children = item.children ?? [];

  if (children.length === 0) {
    return (
      <a
        href={resolveNavItemHref(item, ctx)}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noreferrer" : undefined}
        className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
        onClick={onNavigate}
      >
        {item.label}
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {item.label}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-2 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {children.map((child) => (
              <a
                key={child.id}
                href={resolveNavItemHref(child, ctx)}
                target={child.openInNewTab ? "_blank" : undefined}
                rel={child.openInNewTab ? "noreferrer" : undefined}
                className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                {child.label}
              </a>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MobileNavItem({
  item,
  ctx,
  onNavigate,
}: {
  item: WebsiteNavItem;
  ctx: { companySlug: string; companyId: string };
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = item.children ?? [];

  if (children.length === 0) {
    return (
      <a
        href={resolveNavItemHref(item, ctx)}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noreferrer" : undefined}
        className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
        onClick={onNavigate}
      >
        {item.label}
      </a>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {item.label}
        <ChevronDown className={cn("h-4 w-4 transition", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <div className="ml-3 border-l border-slate-100 pl-3">
          {children.map((child) => (
            <a
              key={child.id}
              href={resolveNavItemHref(child, ctx)}
              target={child.openInNewTab ? "_blank" : undefined}
              rel={child.openInNewTab ? "noreferrer" : undefined}
              className="block rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              onClick={onNavigate}
            >
              {child.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PublicSiteChrome({
  website,
  companySlug,
  companyId,
  companyName,
  landing,
  servicePages = [],
  navigation: navigationProp,
  viewport = "desktop",
  preview = false,
}: Props) {
  const theme = website.theme_settings ?? {};
  const primary = typeof theme.primaryColor === "string" ? theme.primaryColor : "#5a8dee";
  const accent = typeof theme.accentColor === "string" ? theme.accentColor : "#4a6fd8";
  const logoUrl = typeof theme.logoUrl === "string" ? theme.logoUrl : null;
  const bookingLabel = website.booking_button_label || "Book Now";
  const bookingHref = publicBookPath(companyId);

  const navigation =
    navigationProp ??
    getNavigationSettings({
      website,
      landing,
      servicePages,
      companySlug,
      companyName,
    });

  const ctx = { companySlug, companyId };
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMobileViewport = viewport === "mobile";
  const headerItems = visibleNavItems(
    isMobileViewport ? mobileNavItems(navigation) : navigation.header.items,
    isMobileViewport ? "mobile" : "desktop"
  );

  const headerTagline =
    navigation.header.showTagline && navigation.header.tagline
      ? navigation.header.tagline
      : null;

  const secondaryCta = navigation.header.secondaryCta;

  return (
    <>
      {navigation.topbar.enabled ? (
        <div className="text-white" style={{ backgroundColor: primary }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6 sm:text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90">
              {navigation.topbar.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {navigation.topbar.location}
                </span>
              ) : null}
              {navigation.topbar.hours ? (
                <span className="hidden items-center gap-1.5 sm:inline-flex">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {navigation.topbar.hours}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90">
              {navigation.topbar.phone ? (
                <a href={`tel:${navigation.topbar.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-white">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {navigation.topbar.phone}
                </a>
              ) : null}
              {navigation.topbar.email ? (
                <a href={`mailto:${navigation.topbar.email}`} className="hidden items-center gap-1.5 hover:text-white md:inline-flex">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {navigation.topbar.email}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {navigation.header.enabled ? (
        <header
          className={cn(
            "border-b border-slate-200 bg-white",
            navigation.header.sticky && !preview && "sticky top-0 z-40"
          )}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
            <a href={`/site/${companySlug}`} className="flex min-w-0 items-center gap-3">
              {navigation.header.showLogo && logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : navigation.header.showLogo ? (
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: primary }}
                >
                  {companyName.slice(0, 2).toUpperCase()}
                </span>
              ) : null}
              {navigation.header.showBusinessName ? (
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">{companyName}</span>
                  {headerTagline ? (
                    <span className="hidden text-xs text-slate-500 sm:block">{headerTagline}</span>
                  ) : null}
                </span>
              ) : null}
            </a>

            {!isMobileViewport ? (
              <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
                {headerItems.map((item) => (
                  <NavDropdown key={item.id} item={item} ctx={ctx} primary={primary} />
                ))}
              </nav>
            ) : null}

            {!isMobileViewport ? (
              <div className="hidden items-center gap-2 lg:flex">
                {navigation.header.showSecondaryCta && secondaryCta ? (
                  <a
                    href={secondaryCta.href}
                    className="rounded-lg border px-4 py-2 text-sm font-semibold"
                    style={{ borderColor: accent, color: accent }}
                  >
                    {secondaryCta.label}
                  </a>
                ) : null}
                {navigation.header.showBookingButton ? (
                  <a
                    href={bookingHref}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    {bookingLabel}
                  </a>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              className={cn(
                "inline-flex rounded-lg border border-slate-200 p-2 text-slate-700",
                isMobileViewport ? "inline-flex" : "lg:hidden"
              )}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileOpen ? (
            <div
              className={cn(
                "border-t border-slate-100 bg-white px-4 py-4 sm:px-6",
                !isMobileViewport && "lg:hidden"
              )}
            >
              <nav className="flex flex-col gap-0.5" aria-label="Mobile">
                {headerItems.map((item) => (
                  <MobileNavItem
                    key={item.id}
                    item={item}
                    ctx={ctx}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
                {navigation.mobile.showBookingButton || navigation.mobile.showSecondaryCta ? (
                  <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                    {navigation.mobile.showSecondaryCta && secondaryCta ? (
                      <a
                        href={secondaryCta.href}
                        className="rounded-lg border px-4 py-3 text-center text-sm font-semibold"
                        style={{ borderColor: accent, color: accent }}
                        onClick={() => setMobileOpen(false)}
                      >
                        {secondaryCta.label}
                      </a>
                    ) : null}
                    {navigation.mobile.showBookingButton ? (
                      <a
                        href={bookingHref}
                        className="rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
                        style={{ backgroundColor: primary }}
                        onClick={() => setMobileOpen(false)}
                      >
                        {bookingLabel}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </nav>
            </div>
          ) : null}
        </header>
      ) : null}
    </>
  );
}

export function PublicSiteFooter({
  website,
  companySlug,
  companyId,
  companyName,
  landing,
  servicePages = [],
  navigation: navigationProp,
}: Omit<Props, "viewport" | "preview">) {
  const navigation =
    navigationProp ??
    getNavigationSettings({
      website,
      landing,
      servicePages,
      companySlug,
      companyName,
    });

  if (!navigation.footer.enabled) return null;

  const ctx = { companySlug, companyId };
  const theme = website.theme_settings ?? {};
  const primary = typeof theme.primaryColor === "string" ? theme.primaryColor : "#5a8dee";
  const businessName = navigation.footer.businessName ?? companyName;
  const social = navigation.footer.socialLinks ?? {};

  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {navigation.footer.layout === "columns" && navigation.footer.columns.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-semibold text-slate-900">{businessName}</p>
              {navigation.footer.tagline ? (
                <p className="mt-1 text-sm text-slate-600">{navigation.footer.tagline}</p>
              ) : null}
            </div>
            {navigation.footer.columns.map((column) => (
              <div key={column.id}>
                <p className="text-sm font-semibold text-slate-900">{column.title}</p>
                <ul className="mt-3 space-y-2">
                  {visibleNavItems(column.items, "desktop").map((item) => (
                    <li key={item.id}>
                      <a
                        href={resolveNavItemHref(item, ctx)}
                        className="text-sm text-slate-600 hover:text-slate-900"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <p className="font-semibold text-slate-900">{businessName}</p>
            {navigation.footer.tagline ? (
              <p className="mt-1 text-sm text-slate-600">{navigation.footer.tagline}</p>
            ) : null}
          </div>
        )}

        {(social.facebook || social.instagram || social.whatsapp) && (
          <div className="mt-6 flex justify-center gap-4">
            {social.facebook ? (
              <a href={social.facebook} target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:text-slate-800">
                Facebook
              </a>
            ) : null}
            {social.instagram ? (
              <a href={social.instagram} target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:text-slate-800">
                Instagram
              </a>
            ) : null}
            {social.whatsapp ? (
              <a
                href={`https://wa.me/${social.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        )}

        {navigation.footer.showPoweredBy ? (
          <p className="mt-6 text-center text-xs text-slate-400">
            Powered by{" "}
            <span style={{ color: primary }} className="font-medium">
              FaraiOS
            </span>
          </p>
        ) : null}
      </div>
    </footer>
  );
}
