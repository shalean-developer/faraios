import {
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import type { TemplatePaths } from "@/templates/service-business/paths";

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
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

function isInternalPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

function FooterLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (isInternalPath(href)) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
function footerLinkHref(label: string, paths: TemplatePaths): string {
  const lower = label.toLowerCase();
  if (lower.includes("review")) return paths.reviews;
  if (lower.includes("about")) return paths.about;
  if (lower.includes("contact")) return paths.contact;
  if (lower.includes("service")) return paths.services;
  if (lower.includes("pricing")) return paths.services;
  if (lower.includes("faq")) return paths.faq;
  if (lower.includes("privacy")) return "/privacy";
  if (lower.includes("terms")) return "/terms";
  return paths.home;
}

export function SiteFooter({ site, paths }: Props) {
  const { footer, businessName, theme, topbar, contact } = site;
  const phoneHref = topbar.phone.replace(/\s+/g, "");
  const mark = businessName
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const linkClass = "text-base text-slate-300 transition hover:text-white";

  return (
    <footer className="text-slate-300" style={{ backgroundColor: theme.primary }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-12">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-3">
            {topbar.logo ? (
              <span className="relative inline-flex h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/20">
                <Image
                  src={topbar.logo}
                  alt={businessName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </span>
            ) : (
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-sm font-bold text-white">
                {mark}
              </span>
            )}
            <span className="text-lg font-bold text-white">{businessName}</span>
          </div>
          <p className="mt-4 max-w-xs text-base leading-relaxed text-slate-400">
            {footer.description}
          </p>
          <div className="mt-5 flex items-center gap-4">
            {topbar.socialFacebook ? (
              <a
                href={topbar.socialFacebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition hover:text-white"
                aria-label="Facebook"
              >
                <FacebookIcon className="h-5 w-5" />
              </a>
            ) : null}
            {topbar.socialInstagram ? (
              <a
                href={topbar.socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition hover:text-white"
                aria-label="Instagram"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            ) : null}
            {topbar.socialWhatsapp ? (
              <a
                href={`https://wa.me/${topbar.socialWhatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition hover:text-white"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-2">
          <p className="text-base font-semibold text-white">Services</p>
          <ul className="mt-3 space-y-2">
            {footer.serviceLinks.map((item) => (
              <li key={item}>
                <FooterLink href={paths.services} className={linkClass}>
                  {item}
                </FooterLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <p className="text-base font-semibold text-white">Company</p>
          <ul className="mt-3 space-y-2">
            {footer.companyLinks.map((item) => (
              <li key={item}>
                <FooterLink href={footerLinkHref(item, paths)} className={linkClass}>
                  {item}
                </FooterLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <p className="text-base font-semibold text-white">Support</p>
          <ul className="mt-3 space-y-2">
            {footer.supportLinks.map((item) => (
              <li key={item}>
                <FooterLink href={footerLinkHref(item, paths)} className={linkClass}>
                  {item}
                </FooterLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <p className="text-base font-semibold text-white">Contact</p>
          <ul className="mt-3 space-y-3 text-base text-slate-300">
            {topbar.phone ? (
              <li>
                <a
                  href={`tel:${phoneHref}`}
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0 text-sky-300" />
                  {topbar.phone}
                </a>
              </li>
            ) : null}
            {topbar.email ? (
              <li>
                <a
                  href={`mailto:${topbar.email}`}
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-sky-300" />
                  {topbar.email}
                </a>
              </li>
            ) : null}
            <li className="inline-flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <span>{contact.address || topbar.serviceArea}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-5 text-sm sm:flex-row sm:px-6 sm:text-base">
          <p className="text-slate-400">
            &copy; {new Date().getFullYear()} {businessName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-slate-400">
            <FooterLink href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </FooterLink>
            <FooterLink href="/terms" className="transition hover:text-white">
              Terms of Service
            </FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
