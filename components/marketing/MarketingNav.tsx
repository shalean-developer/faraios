"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { cn } from "@/lib/utils";

export type MarketingNavActive =
  | "home"
  | "features"
  | "industries"
  | "pricing"
  | "hosting"
  | "marketplace"
  | "examples";

type MarketingNavProps = {
  isAuthenticated: boolean;
  companySlug: string | null;
  isPlatformAdmin?: boolean;
  active?: MarketingNavActive;
  onLogout: () => Promise<void>;
};

const navLinkClass =
  "text-sm font-medium text-gray-600 transition-colors hover:text-gray-900";

const centerNavLinks: {
  label: string;
  href: string;
  active?: MarketingNavActive;
}[] = [
  { label: "Features", href: "/features", active: "features" },
  { label: "Pricing", href: "/pricing", active: "pricing" },
  { label: "About", href: "/platform/about" },
  { label: "Industries", href: "/industries", active: "industries" },
];

export function MarketingNav({
  isAuthenticated,
  companySlug,
  isPlatformAdmin = false,
  active,
  onLogout,
}: MarketingNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const workspaceHref = companySlug
    ? `/${encodeURIComponent(companySlug)}/dashboard`
    : "/app";
  const logoHref = isAuthenticated ? workspaceHref : "/";

  const closeMobile = () => setMobileOpen(false);

  const activeClass = (key?: MarketingNavActive) =>
    key && active === key ? "text-emerald-700" : undefined;

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href={logoHref}
          className="group flex shrink-0 items-center"
          onClick={closeMobile}
        >
          <FaraiLogo size="header" priority />
        </Link>

        {!isAuthenticated ? (
          <nav
            className="hidden items-center justify-center gap-6 md:flex"
            aria-label="Main navigation"
          >
            {centerNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(navLinkClass, activeClass(link.active))}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                <Link href={workspaceHref} className={navLinkClass}>
                  Workspace
                </Link>
                <details className="relative">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900">
                    <LayoutDashboard className="h-4 w-4" />
                    Account
                  </summary>
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                    <Link
                      href={workspaceHref}
                      className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Workspace
                    </Link>
                    {isPlatformAdmin ? (
                      <>
                        <Link
                          href="/admin"
                          className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Platform admin
                        </Link>
                        <Link
                          href="/admin/pipeline"
                          className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Client projects
                        </Link>
                      </>
                    ) : (
                      <Link
                        href="/app"
                        className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        App home
                      </Link>
                    )}
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
                  href="/auth/sign-in"
                  className="hidden items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:flex"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20"
                >
                  Sign up
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
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {isAuthenticated ? (
              <>
                <Link
                  href={workspaceHref}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={closeMobile}
                >
                  Workspace
                </Link>
                {isPlatformAdmin ? (
                  <>
                    <Link
                      href="/admin"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      onClick={closeMobile}
                    >
                      Platform admin
                    </Link>
                    <Link
                      href="/admin/pipeline"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      onClick={closeMobile}
                    >
                      Client projects
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/app"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={closeMobile}
                  >
                    App home
                  </Link>
                )}
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
                {centerNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={closeMobile}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="my-2 border-t border-gray-100" />
                <Link
                  href="/auth/sign-up"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                  onClick={closeMobile}
                >
                  Sign up
                </Link>
                <Link
                  href="/auth/sign-in"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={closeMobile}
                >
                  Log in
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
