import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { cn } from "@/lib/utils";

type MarketingFooterProps = {
  variant?: "light" | "dark";
};

const linkClass = (dark: boolean) =>
  cn(
    "text-sm transition-colors",
    dark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
  );

const mutedLinkClass = (dark: boolean) =>
  cn(
    "text-sm transition-colors",
    dark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"
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
        <div
          className={cn(
            "mb-10 rounded-2xl border p-6 sm:p-8",
            dark
              ? "border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/10"
              : "border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50/80"
          )}
        >
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-widest",
              dark ? "text-violet-300" : "text-violet-700"
            )}
          >
            For businesses
          </p>
          <p
            className={cn(
              "mt-2 max-w-lg text-base font-semibold sm:text-lg",
              dark ? "text-white" : "text-gray-900"
            )}
          >
            Run bookings, customers, and services from one workspace — with
            optional website build and hosting.
          </p>
          <Link
            href="/auth/sign-up"
            className={cn(
              "mt-4 inline-flex items-center gap-1.5 text-sm font-semibold",
              dark ? "text-violet-300 hover:text-white" : "text-violet-700 hover:text-violet-900"
            )}
          >
            Start your workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <FaraiLogo size="sm" />
            </Link>
            <p
              className={cn(
                "mt-3 max-w-xs text-sm leading-relaxed",
                dark ? "text-slate-400" : "text-gray-500"
              )}
            >
              Business operating system for local service teams. Websites are a
              frontend — operations run in your workspace.
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
                <Link href="/auth/sign-up" className={linkClass(dark)}>
                  Get started
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={linkClass(dark)}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/hosting" className={mutedLinkClass(dark)}>
                  Hosting add-on
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className={mutedLinkClass(dark)}>
                  Marketplace
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
              Account
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/auth/sign-in" className={linkClass(dark)}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/auth/forgot-password" className={linkClass(dark)}>
                  Reset password
                </Link>
              </li>
              <li>
                <Link href="/app" className={linkClass(dark)}>
                  App home
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
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/terms" className={linkClass(dark)}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClass(dark)}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="mailto:support@faraios.com" className={linkClass(dark)}>
                  support@faraios.com
                </a>
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
