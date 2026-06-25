import Link from "next/link";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { FooterSocialLinks } from "@/components/marketing/footer-social-links";
import { FOOTER_INDUSTRY_LINKS } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

type MarketingFooterProps = {
  variant?: "light" | "dark";
};

const linkClass = (dark: boolean) =>
  cn(
    "text-sm transition-colors",
    dark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
  );

export function MarketingFooter({ variant = "light" }: MarketingFooterProps) {
  const dark = variant === "dark";

  return (
    <footer
      className={cn(
        "border-t px-4 py-14 sm:px-6 lg:px-8",
        dark ? "border-white/10 bg-[#0a0f1e] text-slate-300" : "border-slate-100 bg-slate-50 text-slate-600"
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="FaraiOS home" className="inline-flex items-center">
              <FaraiLogo size="md" />
            </Link>
            <p
              className={cn(
                "mt-4 max-w-xs text-sm leading-relaxed",
                dark ? "text-slate-400" : "text-slate-500"
              )}
            >
              FaraiOS is the business operating system for local service businesses — bookings,
              payments, and growth in one connected workspace.
            </p>
            <FooterSocialLinks dark={dark} />
          </div>

          <div>
            <h3
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                dark ? "text-slate-300" : "text-slate-900"
              )}
            >
              Features
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/features" className={linkClass(dark)}>
                  All features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={linkClass(dark)}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/hosting" className={linkClass(dark)}>
                  Website hosting
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className={linkClass(dark)}>
                  Marketplace
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                dark ? "text-slate-300" : "text-slate-900"
              )}
            >
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/platform/about" className={linkClass(dark)}>
                  About
                </Link>
              </li>
              <li>
                <Link href="/platform/contact" className={linkClass(dark)}>
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/industries" className={linkClass(dark)}>
                  Industries
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                dark ? "text-slate-300" : "text-slate-900"
              )}
            >
              Support
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="mailto:support@faraios.com" className={linkClass(dark)}>
                  Help centre
                </a>
              </li>
              <li>
                <Link href="/platform/contact" className={linkClass(dark)}>
                  Contact support
                </Link>
              </li>
              {FOOTER_INDUSTRY_LINKS.slice(0, 2).map((ind) => (
                <li key={ind.slug}>
                  <Link href={`/industries/${ind.slug}`} className={linkClass(dark)}>
                    {ind.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                dark ? "text-slate-300" : "text-slate-900"
              )}
            >
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/terms" className={linkClass(dark)}>
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClass(dark)}>
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p
          className={cn(
            "mt-10 border-t pt-6 text-center text-xs",
            dark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400"
          )}
        >
          © {new Date().getFullYear()} FaraiOS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
