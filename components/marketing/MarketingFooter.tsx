import Link from "next/link";

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
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <FaraiLogo size="sm" />
            </Link>
            <p className={cn("mt-3 max-w-xs text-sm leading-relaxed", dark ? "text-slate-400" : "text-gray-500")}>
              Done-for-you websites — design, build, and launch while you run your business.
            </p>
          </div>

          <div>
            <h3 className={cn("text-xs font-bold uppercase tracking-widest", dark ? "text-slate-300" : "text-gray-900")}>
              Product
            </h3>
            <ul className="mt-4 space-y-2">
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
                <Link href="/auth/sign-up" className={linkClass(dark)}>
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={cn("text-xs font-bold uppercase tracking-widest", dark ? "text-slate-300" : "text-gray-900")}>
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
            <h3 className={cn("text-xs font-bold uppercase tracking-widest", dark ? "text-slate-300" : "text-gray-900")}>
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
