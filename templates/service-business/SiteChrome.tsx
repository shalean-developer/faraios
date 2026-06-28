"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Clock,
  Mail,
  MapPin,
  Menu,
  Phone,
  X,
} from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { outlineBtn, primaryBtn } from "@/templates/service-business/template-styles";
import {
  resolveTemplateHref,
  type TemplatePaths,
} from "@/templates/service-business/paths";

type Props = {
  site: ParsedSiteContent;
  bookingUrl?: string | null;
  paths: TemplatePaths;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
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

export function SiteChrome({ site, bookingUrl, paths }: Props) {
  const [open, setOpen] = useState(false);
  const { topbar, hero, businessName, theme } = site;
  const phoneHref = topbar.phone.replace(/\s+/g, "");
  const mark = businessName
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const nav = [
    { href: paths.services, label: "Services" },
    { href: paths.services, label: "Pricing" },
    { href: paths.about, label: "About" },
    { href: paths.reviews, label: "Reviews" },
    { href: paths.contact, label: "Contact" },
  ];

  const quoteHref = resolveTemplateHref(hero.quoteCtaHref, paths);
  const bookHref = bookingUrl ?? resolveTemplateHref(hero.ctaHref, paths);
  const hideBusinessName =
    topbar.hideBusinessNameInHeader && Boolean(topbar.logo?.trim());

  const headerOutlineBtn = `${outlineBtn} px-5 py-3 text-base`;
  const headerPrimaryBtn = `${primaryBtn} px-6 py-3 text-base shadow-sm`;

  return (
    <>
      <div className="text-white" style={{ backgroundColor: theme.primary }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-200">
            <span className="inline-flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 shrink-0 text-sky-300" />
              {topbar.serviceArea}
            </span>
            <span className="hidden h-4 w-px bg-white/20 sm:inline" aria-hidden />
            <span className="hidden items-center gap-2 sm:inline-flex">
              <Clock className="h-4 w-4 shrink-0 text-sky-300" />
              {topbar.hours}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-200">
            {topbar.phone ? (
              <a
                href={`tel:${phoneHref}`}
                className="inline-flex items-center gap-2 font-medium transition hover:text-white"
              >
                <Phone className="h-4 w-4 shrink-0" />
                {topbar.phone}
              </a>
            ) : null}
            {topbar.email ? (
              <a
                href={`mailto:${topbar.email}`}
                className="hidden items-center gap-2 font-medium transition hover:text-white md:inline-flex"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="max-w-[200px] truncate">{topbar.email}</span>
              </a>
            ) : null}
            {(topbar.socialFacebook || topbar.socialInstagram || topbar.socialWhatsapp) ? (
              <span className="hidden h-4 w-px bg-white/20 lg:inline" aria-hidden />
            ) : null}
            <div className="hidden items-center gap-3 lg:flex">
              {topbar.socialFacebook ? (
                <a
                  href={topbar.socialFacebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 transition hover:text-white"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
              ) : null}
              {topbar.socialInstagram ? (
                <a
                  href={topbar.socialInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 transition hover:text-white"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="h-4 w-4" />
                </a>
              ) : null}
              {topbar.socialWhatsapp ? (
                <a
                  href={`https://wa.me/${topbar.socialWhatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 transition hover:text-white"
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-5 py-4 sm:px-6 lg:gap-12 lg:py-5">
          <a href={paths.home} className="flex min-w-0 shrink-0 items-center gap-4">
            {topbar.logo ? (
              <span className="relative inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-full lg:h-14 lg:w-14">
                <Image
                  src={topbar.logo}
                  alt={businessName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </span>
            ) : (
              <span
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-md lg:h-14 lg:w-14"
                style={{ backgroundColor: theme.primary }}
              >
                {mark}
              </span>
            )}
            {hideBusinessName ? null : (
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold text-slate-900 lg:text-xl">
                  {businessName}
                </span>
                {topbar.tagline ? (
                  <span className="hidden text-xs font-semibold tracking-[0.12em] text-slate-500 sm:block">
                    {topbar.tagline}
                  </span>
                ) : null}
              </span>
            )}
          </a>

          <nav className="hidden items-center gap-8 xl:flex" aria-label="Primary">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-base font-medium text-slate-600 transition hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <a
              href={quoteHref}
              className={headerOutlineBtn}
              style={{ borderColor: theme.accent, color: theme.accent }}
            >
              {hero.quoteCtaLabel}
            </a>
            <a
              href={bookHref}
              className={headerPrimaryBtn}
              style={{ backgroundColor: theme.accent }}
            >
              Book Now
            </a>
          </div>

          <button
            type="button"
            className="inline-flex rounded-xl border border-slate-200 p-2.5 text-slate-700 xl:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-slate-100 bg-white px-5 py-5 sm:px-6 xl:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {nav.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-lg px-3 py-3.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
                <a
                  href={quoteHref}
                  className={`${headerOutlineBtn} w-full`}
                  style={{ borderColor: theme.accent, color: theme.accent }}
                  onClick={() => setOpen(false)}
                >
                  {hero.quoteCtaLabel}
                </a>
                <a
                  href={bookHref}
                  className={`${headerPrimaryBtn} w-full`}
                  style={{ backgroundColor: theme.accent }}
                  onClick={() => setOpen(false)}
                >
                  Book Now
                </a>
              </div>
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
}
