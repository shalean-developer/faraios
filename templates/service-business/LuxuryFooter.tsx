import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { luxury } from "@/templates/service-business/luxury-styles";
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
}: {
  href: string;
  children: React.ReactNode;
}) {
  const className =
    "group inline-flex items-center gap-1.5 text-sm text-[#f2f0d9]/80 transition hover:text-[#f2f0d9]";
  if (isInternalPath(href)) {
    return (
      <Link href={href} className={className} style={{ fontFamily: luxury.sans }}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} style={{ fontFamily: luxury.sans }}>
      {children}
    </a>
  );
}

function FooterNavLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <FooterLink href={href}>
        {label}
        <ArrowUpRight className="h-3 w-3 opacity-60 transition group-hover:opacity-100" strokeWidth={1.75} />
      </FooterLink>
    </li>
  );
}

export function LuxuryFooter({ site, paths }: Props) {
  const { businessName, topbar, footer } = site;
  const phoneHref = topbar.phone.replace(/\s+/g, "");
  const year = new Date().getFullYear();
  const footerHeadline =
    footer.description?.trim() ||
    "Holistic perspectives for Being and Spirit";

  const menuLinks = [
    { label: "About", href: paths.about },
    { label: "Services", href: paths.services },
    { label: "Blog", href: paths.blog },
    { label: "Articles", href: paths.blog },
    { label: "Contact", href: paths.contact },
  ];

  const contactLinks = [
    ...(topbar.phone
      ? [{ label: "Call Us", href: `tel:${phoneHref}` }]
      : []),
    ...(topbar.email
      ? [{ label: "Email Us", href: `mailto:${topbar.email}` }]
      : []),
    { label: "Live Chat", href: paths.contact },
  ];

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Services", href: paths.services },
    { label: "Cookie Settings", href: "/privacy" },
  ];

  const socialLinks = [
    ...(topbar.socialFacebook
      ? [{ label: "Facebook", href: topbar.socialFacebook }]
      : []),
    ...(topbar.socialInstagram
      ? [{ label: "Instagram", href: topbar.socialInstagram }]
      : [{ label: "Instagram", href: paths.contact }]),
    { label: "X (Twitter)", href: paths.contact },
    { label: "LinkedIn", href: paths.contact },
  ];

  return (
    <footer className="bg-[#3d3d29] text-[#f2f0d9]">
      <div className={`${sectionContainer} py-14 sm:py-16 lg:py-20`}>
        <div className="flex flex-col gap-8 border-b border-[#f2f0d9]/15 pb-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <h2
            className="max-w-md text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.15] text-[#f2f0d9]"
            style={{ fontFamily: luxury.serif }}
          >
            {footerHeadline}
          </h2>
          <div className="max-w-xs lg:text-right">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f2f0d9]/60"
              style={{ fontFamily: luxury.sans }}
            >
              A commitment to consistency, care, and community
            </p>
            <FooterLink href={paths.contact}>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#f2f0d9]">
                Join Now
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
            </FooterLink>
          </div>
        </div>

        <div className="mt-12 grid border border-[#f2f0d9]/15 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Menu", links: menuLinks },
            { title: "Contact", links: contactLinks },
            { title: "Legal", links: legalLinks },
            { title: "Follow Us", links: socialLinks },
          ].map((col, colIndex) => (
            <div
              key={col.title}
              className={`border-[#f2f0d9]/15 px-6 py-8 ${
                colIndex > 0 ? "border-t sm:border-t-0 sm:border-l" : ""
              } ${colIndex >= 2 ? "sm:border-t lg:border-t-0" : ""}`}
            >
              <p
                className="text-sm font-medium text-[#f2f0d9]"
                style={{ fontFamily: luxury.sans }}
              >
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <FooterNavLink key={link.label} href={link.href} label={link.label} />
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[#f2f0d9]/15 pt-8 text-sm text-[#f2f0d9]/55 sm:flex-row sm:items-center"
          style={{ fontFamily: luxury.sans }}
        >
          <p>
            @ {year}, {businessName}
          </p>
          <p>All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}
