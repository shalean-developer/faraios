"use client";

import Link from "next/link";

import { AuthBrandLogo } from "@/components/auth/auth-brand-logo";
import { AuthMarketingPanel } from "@/components/auth/auth-marketing-panel";

type AuthPageShellProps = {
  children: React.ReactNode;
  /** Optional support line below the form card (sign-up flow). */
  showSupport?: boolean;
};

export function AuthPageShell({ children, showSupport = false }: AuthPageShellProps) {
  return (
    <div className="flex min-h-dvh w-full overflow-x-hidden font-sans lg:min-h-screen">
      <AuthMarketingPanel />

      <div
        className="flex flex-1 items-center justify-center px-4 py-6 lg:py-8"
        style={{ background: "#f8f9fc" }}
      >
        <div className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-100 bg-white/90 px-4 shadow-sm backdrop-blur-md lg:hidden">
          <AuthBrandLogo />
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Home
          </Link>
        </div>

        <div className="w-full max-w-md pt-14 lg:max-w-[420px] lg:pt-0">
          {children}

          {showSupport ? (
            <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
              Need help?{" "}
              <a
                href="mailto:support@faraios.com"
                className="font-semibold text-violet-600 hover:underline"
              >
                Contact support
              </a>{" "}
              — average response under 2 hours.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
