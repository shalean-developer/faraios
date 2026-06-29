"use client";

import Link from "next/link";
import { useState } from "react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { sectionContainer } from "@/templates/service-business/template-styles";
import type { TemplatePaths } from "@/templates/service-business/paths";

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
};

function isInternalPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

function FooterLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = className ?? "text-sm text-white/75 transition hover:text-white";
  if (isInternalPath(href)) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}

function footerLinkHref(label: string, paths: TemplatePaths): string {
  const lower = label.toLowerCase();
  if (lower.includes("blog")) return paths.blog;
  if (lower.includes("review")) return paths.reviews;
  if (lower.includes("about")) return paths.about;
  if (lower.includes("contact")) return paths.contact;
  if (lower.includes("service")) return paths.services;
  if (lower.includes("project")) return paths.services;
  if (lower.includes("faq")) return paths.faq;
  if (lower.includes("privacy")) return "/privacy";
  if (lower.includes("terms")) return "/terms";
  return paths.home;
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

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const TRUST_BADGES = [
  { label: "Proud Partner", className: "bg-pink-500" },
  { label: "100% Satisfaction Guaranteed", className: "bg-emerald-500" },
  { label: "Pro Clean Promise", className: "bg-sky-400" },
];

const DEFAULT_COMPANY_LINKS = ["About", "Service", "Service Details", "Reviews"];
const DEFAULT_RESOURCE_LINKS = ["Blogs", "Projects", "Project details", "Privacy Policy"];

export function ModernOverlayFooter({ site, paths }: Props) {
  const { footer, businessName, topbar, homeBlog, theme } = site;
  const [email, setEmail] = useState("");
  const year = new Date().getFullYear();
  const phone = homeBlog.callCtaPhone?.trim() || topbar.phone?.trim();
  const phoneHref = phone ? `tel:${phone.replace(/\s+/g, "")}` : null;
  const callLabel = phone
    ? `${homeBlog.callCtaPrefix} (${phone})`
    : homeBlog.callCtaPrefix;

  const headline = footer.description || "Modern Home Upgrades Made Easy Today";

  const companyLinks = footer.companyLinks.length >= 4 ? footer.companyLinks : DEFAULT_COMPANY_LINKS;
  const resourceLinks =
    footer.resourceLinks.length >= 4 ? footer.resourceLinks : DEFAULT_RESOURCE_LINKS;

  const copyrightName = footer.copyrightName || businessName;

  const socialLinks = [
    topbar.socialTwitter ? { href: topbar.socialTwitter, label: "Twitter", Icon: TwitterIcon } : null,
    topbar.socialFacebook ? { href: topbar.socialFacebook, label: "Facebook", Icon: FacebookIcon } : null,
    topbar.socialInstagram ? { href: topbar.socialInstagram, label: "Instagram", Icon: InstagramIcon } : null,
    { href: paths.contact, label: "GitHub", Icon: GithubIcon },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof TwitterIcon }[];

  function handleNewsletterSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (topbar.email && email.trim()) {
      window.location.href = `mailto:${topbar.email}?subject=Newsletter%20signup&body=${encodeURIComponent(email.trim())}`;
    }
  }

  return (
    <footer className="relative bg-[#111827] text-white">
      <div className={`${sectionContainer} relative z-10 -mt-8 flex justify-center px-4 sm:-mt-10 sm:px-6`}>
        {phoneHref ? (
          <a
            href={phoneHref}
            className="inline-flex w-full max-w-3xl items-center justify-center rounded-full px-6 py-4 text-center text-sm font-bold text-white shadow-lg transition hover:opacity-95 sm:text-base"
            style={{ backgroundColor: theme.accent }}
          >
            {callLabel}
          </a>
        ) : (
          <p
            className="inline-flex w-full max-w-3xl items-center justify-center rounded-full px-6 py-4 text-center text-sm font-bold sm:text-base"
            style={{ backgroundColor: theme.accent }}
          >
            {callLabel}
          </p>
        )}
      </div>

      <div className={`${sectionContainer} px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-16`}>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="max-w-sm text-2xl font-bold leading-tight sm:text-3xl">{headline}</h2>
            <ul className="mt-8 flex flex-wrap gap-4">
              {TRUST_BADGES.map((badge) => (
                <li key={badge.label}>
                  <span
                    className={`inline-flex h-16 w-16 items-center justify-center rounded-full p-2 text-center text-[9px] font-bold leading-tight text-white sm:h-[4.5rem] sm:w-[4.5rem] sm:text-[10px] ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-4">
            <div>
              <p className="text-base font-bold text-white">Company</p>
              <ul className="mt-4 space-y-3">
                {companyLinks.map((item) => (
                  <li key={item}>
                    <FooterLink href={footerLinkHref(item, paths)}>{item}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-base font-bold text-white">Resources</p>
              <ul className="mt-4 space-y-3">
                {resourceLinks.map((item) => (
                  <li key={item}>
                    <FooterLink href={footerLinkHref(item, paths)}>{item}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-4">
            <p className="text-base font-bold text-white">{footer.newsletterHeading}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{footer.newsletterBody}</p>
            <form onSubmit={handleNewsletterSubmit} className="relative mt-5">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-full border-0 bg-white py-3.5 pl-5 pr-28 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full px-5 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: theme.accent }}
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/60">
            © {year} {copyrightName}. All Rights Reserved.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                aria-label={label}
                className="text-white/60 transition hover:text-white"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
