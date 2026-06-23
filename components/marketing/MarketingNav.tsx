"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { cn } from "@/lib/utils";

export type MarketingNavActive = "home" | "pricing" | "hosting" | "marketplace" | "examples";

type MarketingNavProps = {
  isAuthenticated: boolean;
  companySlug: string | null;
  isPlatformAdmin?: boolean;
  active?: MarketingNavActive;
  onLogout: () => Promise<void>;
};

const navLinkClass =
  "text-sm font-medium text-gray-600 transition-colors hover:text-gray-900";

export function MarketingNav({
  isAuthenticated,
  companySlug,
  isPlatformAdmin = false,
  active,
  onLogout,
}: MarketingNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const appHref = isPlatformAdmin ? "/admin" : "/app";
  const dashboardHref = isPlatformAdmin
    ? "/admin"
    : companySlug
      ? `/${encodeURIComponent(companySlug)}/dashboard`
      : appHref;

  const closeMobile = () => setMobileOpen(false);

  const activeClass = (key: MarketingNavActive) =>
    active === key ? "text-violet-700" : undefined;

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={isAuthenticated ? appHref : "/"}
          className="group flex items-center"
          onClick={closeMobile}
        >
          <FaraiLogo size="header" priority />
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated ? (
              <>
                <Link href={dashboardHref} className={navLinkClass}>
                  Workspace
                </Link>
                <details className="relative">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900">
                    <LayoutDashboard className="h-4 w-4" />
                    Account
                  </summary>
                  <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                    <Link
                      href={appHref}
                      className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {isPlatformAdmin ? "Admin" : "App"}
                    </Link>
                    {isPlatformAdmin ? (
                      <Link
                        href="/admin/pipeline"
                        className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Client projects
                      </Link>
                    ) : null}
                    <Link
                      href="/pricing"
                      className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Billing
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void onLogout();
                      }}
                      className="mt-1 flex w-full items-center gap-1 rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link
                  href="/pricing"
                  className={cn(navLinkClass, activeClass("pricing"))}
                >
                  Pricing
                </Link>
                <Link
                  href="/auth/sign-in"
                  className="hidden items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:flex"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-200"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-700 md:hidden"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile account">
            {isAuthenticated ? (
              <>
                <Link
                  href={appHref}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={closeMobile}
                >
                  App
                </Link>
                <Link
                  href={dashboardHref}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={closeMobile}
                >
                  Workspace
                </Link>
                {isPlatformAdmin ? (
                  <Link
                    href="/admin/pipeline"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={closeMobile}
                  >
                    Client projects
                  </Link>
                ) : null}
                <Link
                  href="/pricing"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={closeMobile}
                >
                  Billing
                </Link>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    closeMobile();
                    void onLogout();
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-up"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                  onClick={closeMobile}
                >
                  Get started
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={closeMobile}
                >
                  Pricing
                </Link>
                <Link
                  href="/auth/sign-in"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={closeMobile}
                >
                  Sign in
                </Link>
                <Link
                  href="/marketplace"
                  className="mt-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  onClick={closeMobile}
                >
                  Marketplace
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
