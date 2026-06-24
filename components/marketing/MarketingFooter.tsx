import Link from "next/link";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { FOOTER_INDUSTRY_LINKS } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

type MarketingFooterProps = {
  variant?: "light" | "dark";
};

const linkClass = (dark: boolean) =>
  cn(
    "text-sm transition-colors",
    dark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
  );

export function MarketingFooter({ variant = "light" }: MarketingFooterProps) {
  const dark = variant === "dark";

  return (
    <footer
      className={cn(
        "border-t px-4 py-12 sm:px-6 lg:px-8",
        dark ? "border-white/10 bg-[#0a0f1e] text-slate-300" : "border-gray-100 bg-gray-50 text-gray-600"
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              aria-label="FaraiOS home"
              className={cn(
                "inline-flex items-center rounded-xl",
                dark
                  ? "bg-white px-3 py-2 shadow-md shadow-black/20"
                  : "bg-white px-3 py-2 shadow-sm ring-1 ring-gray-200/70"
              )}
            >
              <FaraiLogo
                size="md"
                imageClassName="h-11 w-auto max-w-[160px] object-contain object-left"
              />
            </Link>
            <p
              className={cn(
                "mt-3 max-w-xs text-sm leading-relaxed",
                dark ? "text-slate-400" : "text-gray-500"
              )}
            >
              FaraiOS is a business operating system for local service businesses.
            </p>
          </div>

          <div>
            <h3
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                dark ? "text-slate-300" : "text-gray-900"
              )}
            >
              Product
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/features" className={linkClass(dark)}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={linkClass(dark)}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className={linkClass(dark)}>
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/hosting" className={linkClass(dark)}>
                  Hosting
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                dark ? "text-slate-300" : "text-gray-900"
              )}
            >
              Industries
            </h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_INDUSTRY_LINKS.map((ind) => (
                <li key={ind.slug}>
                  <Link href={`/industries/${ind.slug}`} className={linkClass(dark)}>
                    {ind.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/industries" className={linkClass(dark)}>
                  View all industries
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                dark ? "text-slate-300" : "text-gray-900"
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
                <a href="mailto:support@faraios.com" className={linkClass(dark)}>
                  Support
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                dark ? "text-slate-300" : "text-gray-900"
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
            dark ? "border-white/10 text-slate-500" : "border-gray-200 text-gray-400"
          )}
        >
          © {new Date().getFullYear()} FaraiOS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
