"use client";

import { useState } from "react";
import {
  ChevronDown,
  Clock,
  Home,
  Mail,
  MapPin,
  Menu,
  Phone,
  X,
} from "lucide-react";

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
import type {
  WebsiteNavItem,
  WebsiteNavigationSettings,
  WebsiteSocialLinks,
} from "@/types/website-builder-navigation";

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
  /** When "overlay", chrome is rendered inside a hero section (no sticky wrapper). */
  chromePosition?: "stacked" | "overlay";
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TopbarSocialLinks({
  social,
}: {
  social: WebsiteSocialLinks;
  accent: string;
}) {
  const linkClass = "text-white/80 transition hover:text-white";
  return (
    <div className="flex items-center gap-3">
      {social.facebook ? (
        <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className={linkClass}>
          <FacebookIcon className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {social.twitter ? (
        <a href={social.twitter} target="_blank" rel="noreferrer" aria-label="Twitter" className={linkClass}>
          <TwitterIcon className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {social.instagram ? (
        <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className={linkClass}>
          <InstagramIcon className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {social.youtube ? (
        <a href={social.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className={linkClass}>
          <YoutubeIcon className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {social.whatsapp ? (
        <a
          href={`https://wa.me/${social.whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className={linkClass}
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
  );
}

function NavDropdown({
  item,
  ctx,
  dark,
  onNavigate,
}: {
  item: WebsiteNavItem;
  ctx: { companySlug: string; companyId: string };
  dark?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const children = item.children ?? [];
  const linkClass = dark
    ? "text-sm font-medium text-white/90 transition hover:text-white"
    : "text-sm font-medium text-slate-600 transition hover:text-slate-900";

  if (children.length === 0) {
    return (
      <a
        href={resolveNavItemHref(item, ctx)}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noreferrer" : undefined}
        className={linkClass}
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
        className={cn("inline-flex items-center gap-1", linkClass)}
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
  dark,
  onNavigate,
}: {
  item: WebsiteNavItem;
  ctx: { companySlug: string; companyId: string };
  dark?: boolean;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = item.children ?? [];
  const linkClass = dark
    ? "rounded-lg px-3 py-3 text-base font-medium text-white/90 transition hover:bg-white/10"
    : "rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50";

  if (children.length === 0) {
    return (
      <a
        href={resolveNavItemHref(item, ctx)}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noreferrer" : undefined}
        className={linkClass}
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
        className={cn("flex w-full items-center justify-between", linkClass)}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {item.label}
        <ChevronDown className={cn("h-4 w-4 transition", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <div className={cn("ml-3 border-l pl-3", dark ? "border-white/20" : "border-slate-100")}>
          {children.map((child) => (
            <a
              key={child.id}
              href={resolveNavItemHref(child, ctx)}
              target={child.openInNewTab ? "_blank" : undefined}
              rel={child.openInNewTab ? "noreferrer" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm",
                dark ? "text-white/80 hover:bg-white/10" : "text-slate-600 hover:bg-slate-50"
              )}
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
  chromePosition = "stacked",
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
  const headerVariant = navigation.header.variant ?? "light";
  const darkNav = headerVariant === "dark" || headerVariant === "overlay";
  const isOverlay = chromePosition === "overlay" || headerVariant === "overlay";

  const topbarEl =
    navigation.topbar.enabled ? (
      <div className="text-white" style={{ backgroundColor: darkNav ? "#1a1a1a" : primary }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs sm:px-6 sm:text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90">
            {navigation.topbar.socialLinks ? (
              <TopbarSocialLinks social={navigation.topbar.socialLinks} accent={accent} />
            ) : !darkNav ? (
              <>
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
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-white/90">
            {darkNav && navigation.topbar.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                {navigation.topbar.location}
              </span>
            ) : null}
            {darkNav && navigation.topbar.hours ? (
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                {navigation.topbar.hours}
              </span>
            ) : null}
            {navigation.topbar.phone ? (
              <a
                href={`tel:${navigation.topbar.phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 hover:text-white"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                {navigation.topbar.phone}
              </a>
            ) : null}
            {navigation.topbar.email ? (
              <a
                href={`mailto:${navigation.topbar.email}`}
                className="hidden items-center gap-1.5 hover:text-white md:inline-flex"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                {navigation.topbar.email}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    ) : null;

  if (!navigation.header.enabled) {
    return isOverlay ? null : <>{topbarEl}</>;
  }

  const headerShellClass = isOverlay
    ? "relative z-20 bg-black/45 backdrop-blur-[2px]"
    : cn(
        darkNav ? "bg-[#1a1a1a] text-white" : "border-b border-slate-200 bg-white",
        navigation.header.sticky && !preview && !isOverlay && "sticky top-0 z-40"
      );

  const logoMark = (
    <a href={`/site/${companySlug}`} className="flex min-w-0 shrink-0 items-center gap-3">
      {navigation.header.showLogo && logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className={cn(
            "h-10 w-10 object-cover",
            darkNav ? "rounded-lg" : "rounded-lg"
          )}
        />
      ) : navigation.header.showLogo ? (
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: accent }}
        >
          <Home className="h-5 w-5" strokeWidth={2} />
        </span>
      ) : null}
      {navigation.header.showBusinessName ? (
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-lg font-bold",
              darkNav ? "text-white" : "text-slate-900"
            )}
          >
            {companyName}
          </span>
          {headerTagline ? (
            <span
              className={cn(
                "hidden text-xs sm:block",
                darkNav ? "text-white/70" : "text-slate-500"
              )}
            >
              {headerTagline}
            </span>
          ) : null}
        </span>
      ) : null}
    </a>
  );

  const headerEl = (
    <header className={headerShellClass}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        {logoMark}

        {!isMobileViewport ? (
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
            {headerItems.map((item) => (
              <NavDropdown key={item.id} item={item} ctx={ctx} dark={darkNav} />
            ))}
          </nav>
        ) : null}

        {!isMobileViewport ? (
          <div className="hidden items-center gap-2 lg:flex">
            {navigation.header.showSecondaryCta && secondaryCta ? (
              <a
                href={secondaryCta.href}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-semibold",
                  darkNav ? "border-white/40 text-white hover:bg-white/10" : ""
                )}
                style={darkNav ? undefined : { borderColor: accent, color: accent }}
              >
                {secondaryCta.label}
              </a>
            ) : null}
            {navigation.header.showBookingButton ? (
              <a
                href={bookingHref}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                {bookingLabel}
              </a>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className={cn(
            "inline-flex rounded-lg border p-2",
            darkNav
              ? "border-white/20 text-white lg:hidden"
              : "border-slate-200 text-slate-700 lg:hidden",
            isMobileViewport && "inline-flex"
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
            "border-t px-4 py-4 sm:px-6 lg:hidden",
            darkNav ? "border-white/10 bg-black/80" : "border-slate-100 bg-white"
          )}
        >
          <nav className="flex flex-col gap-0.5" aria-label="Mobile">
            {headerItems.map((item) => (
              <MobileNavItem
                key={item.id}
                item={item}
                ctx={ctx}
                dark={darkNav}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
            {navigation.mobile.showBookingButton || navigation.mobile.showSecondaryCta ? (
              <div
                className={cn(
                  "mt-3 flex flex-col gap-2 border-t pt-3",
                  darkNav ? "border-white/10" : "border-slate-100"
                )}
              >
                {navigation.mobile.showSecondaryCta && secondaryCta ? (
                  <a
                    href={secondaryCta.href}
                    className="rounded-lg border px-4 py-3 text-center text-sm font-semibold"
                    style={{ borderColor: accent, color: darkNav ? "white" : accent }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {secondaryCta.label}
                  </a>
                ) : null}
                {navigation.mobile.showBookingButton ? (
                  <a
                    href={bookingHref}
                    className="rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
                    style={{ backgroundColor: accent }}
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
  );

  if (isOverlay) {
    return (
      <div className="relative z-20">
        {topbarEl}
        {headerEl}
      </div>
    );
  }

  return (
    <>
      {topbarEl}
      {headerEl}
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
}: Omit<Props, "viewport" | "preview" | "chromePosition">) {
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
